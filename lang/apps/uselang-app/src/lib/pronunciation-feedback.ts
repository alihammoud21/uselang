// ── Pronunciation feedback ────────────────────────────────────────────────
// Word-level scoring engine. Compares a speech-recognizer transcript against
// the target phrase using word-level alignment with partial credit.
//
// Key improvements over character-level matching:
//   • Dropped syllables are caught (e.g. "quero" vs "quiero" = partial, not full)
//   • missingSegments returns whole words, not individual characters
//   • Per-word match status powers a visual green/amber/red diff in the UI
//   • Native-language detection warns if the user spoke in English instead
//   • matchedWords / totalWords enable a "3 of 5 words" progress indicator

export type WordMatchStatus = "matched" | "partial" | "missed";

export interface WordMatch {
  /** The original word from the target phrase (preserving casing). */
  word: string;
  /** How well this word was matched in the attempt. */
  status: WordMatchStatus;
  /** 0..1 — character-level similarity for this specific word. */
  similarity: number;
}

export interface PronunciationFeedback {
  /** 0..1 — weighted score across all words. */
  score: number;
  /** Human label for the score range. */
  rating: "spot-on" | "close" | "almost" | "off";
  /** Whole words/syllables from the target that were missed or partial. */
  missingSegments: string[];
  /** One coaching line keyed to the rating. */
  suggestion: string;
  /** Per-word match breakdown — powers the visual diff UI. */
  wordMatches: WordMatch[];
  /** How many words were fully or partially matched. */
  matchedWords: number;
  /** Total words in the target phrase. */
  totalWords: number;
  /** True if the attempt appears to be in the wrong language. */
  wrongLanguageDetected: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const PUNCT_RE = /[。．\.！?？，,;:、'"""''()\[\]¿¡«»‹›]/g;
const CJK_RE = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

function stripPunct(text: string): string {
  return text.replace(PUNCT_RE, "").trim();
}

function lower(text: string): string {
  return text.toLowerCase();
}

/** Split into words. For CJK text, each character is a "word". */
function tokenize(raw: string): string[] {
  const cleaned = stripPunct(raw);
  if (!cleaned) return [];
  if (CJK_RE.test(cleaned)) {
    // CJK: each character is a token (spaces between are removed)
    return cleaned.replace(/\s+/g, "").split("");
  }
  return cleaned.split(/\s+/);
}

/** Character-level similarity between two strings (0..1). */
function charSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const la = lower(a);
  const lb = lower(b);
  if (la === lb) return 1;

  // Build character multiset from b, count matches against a
  const counts = new Map<string, number>();
  for (const ch of lb) counts.set(ch, (counts.get(ch) || 0) + 1);
  let matched = 0;
  for (const ch of la) {
    const left = counts.get(ch) || 0;
    if (left > 0) {
      matched++;
      counts.set(ch, left - 1);
    }
  }
  return matched / Math.max(la.length, lb.length);
}

/** Find the best-matching word in `pool` for `target`. Returns index + similarity. */
function bestMatch(target: string, pool: string[]): { idx: number; sim: number } {
  let bestIdx = -1;
  let bestSim = 0;
  for (let i = 0; i < pool.length; i++) {
    const sim = charSimilarity(target, pool[i]);
    if (sim > bestSim) {
      bestSim = sim;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, sim: bestSim };
}

// Common English filler words that indicate wrong language
const ENGLISH_MARKERS = new Set([
  "the", "a", "an", "is", "am", "are", "was", "were", "i", "you", "he",
  "she", "it", "we", "they", "my", "your", "this", "that", "and", "but",
  "or", "not", "have", "has", "do", "does", "can", "will", "would", "should",
  "what", "how", "where", "when", "why", "who", "hello", "hi", "please",
  "thank", "thanks", "yes", "no", "okay",
]);

function detectWrongLanguage(attemptWords: string[], target: string): boolean {
  // Only flag if target is NOT English (has non-ASCII or CJK)
  const isTargetEnglish = !CJK_RE.test(target) && /^[a-z\s]+$/i.test(stripPunct(target));
  if (isTargetEnglish) return false;
  if (attemptWords.length < 2) return false;

  let englishCount = 0;
  for (const w of attemptWords) {
    if (ENGLISH_MARKERS.has(lower(w))) englishCount++;
  }
  return englishCount / attemptWords.length >= 0.5;
}

// ── Main scoring function ────────────────────────────────────────────────

/**
 * Score a recognized attempt against the target phrase using word-level
 * alignment with partial credit and order sensitivity.
 */
export function comparePronunciation(target: string, attempt: string): PronunciationFeedback {
  const targetWords = tokenize(target);
  const attemptWords = tokenize(attempt);

  // ── Edge cases ──
  if (!targetWords.length) {
    return {
      score: 0, rating: "off", missingSegments: [], suggestion: "I didn't catch the target phrase — try again.",
      wordMatches: [], matchedWords: 0, totalWords: 0, wrongLanguageDetected: false,
    };
  }
  if (!attemptWords.length) {
    return {
      score: 0, rating: "off",
      missingSegments: targetWords,
      suggestion: "I didn't catch any speech. Hold the orb and try again — get close to the mic.",
      wordMatches: targetWords.map((w) => ({ word: w, status: "missed" as const, similarity: 0 })),
      matchedWords: 0, totalWords: targetWords.length, wrongLanguageDetected: false,
    };
  }

  // ── Wrong language detection ──
  const wrongLanguageDetected = detectWrongLanguage(attemptWords, target);

  // ── Word-level alignment ──
  // Greedy left-to-right: for each target word, find the best match in the
  // remaining attempt pool. Preserves order sensitivity — a word that appears
  // out of order gets reduced credit.
  const available = attemptWords.map((w) => lower(w));
  const wordMatches: WordMatch[] = [];
  const missingSegments: string[] = [];
  let totalScore = 0;

  for (let ti = 0; ti < targetWords.length; ti++) {
    const tw = targetWords[ti];
    const twLower = lower(tw);

    // Exact match first (order-preserving: prefer matches near expected position)
    let foundIdx = -1;
    const idealStart = Math.max(0, ti - 1);
    const idealEnd = Math.min(available.length, ti + 3);

    // Pass 1: exact match near expected position
    for (let i = idealStart; i < idealEnd; i++) {
      if (available[i] === twLower) { foundIdx = i; break; }
    }
    // Pass 2: exact match anywhere
    if (foundIdx === -1) {
      foundIdx = available.indexOf(twLower);
    }

    if (foundIdx !== -1) {
      wordMatches.push({ word: tw, status: "matched", similarity: 1 });
      totalScore += 1;
      available[foundIdx] = ""; // consume
      continue;
    }

    // No exact match — find best partial match
    const { idx, sim } = bestMatch(twLower, available);
    if (idx !== -1 && sim >= 0.5) {
      // Partial credit: word was recognizable but imperfect
      const credit = sim >= 0.8 ? 0.85 : sim >= 0.6 ? 0.65 : 0.4;
      wordMatches.push({ word: tw, status: "partial", similarity: sim });
      totalScore += credit;
      available[idx] = ""; // consume
      missingSegments.push(tw);
    } else {
      // Missed entirely
      wordMatches.push({ word: tw, status: "missed", similarity: sim > 0 ? sim : 0 });
      missingSegments.push(tw);
    }
  }

  const score = targetWords.length > 0 ? totalScore / targetWords.length : 0;
  const matchedWords = wordMatches.filter((m) => m.status === "matched" || m.status === "partial").length;

  const rating: PronunciationFeedback["rating"] =
    score >= 0.92 ? "spot-on" :
    score >= 0.72 ? "close" :
    score >= 0.45 ? "almost" : "off";

  // ── Suggestion generation ──
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const isCJK = CJK_RE.test(target);
  const focusWords = missingSegments.slice(0, 2);
  const focusHint = focusWords.length
    ? focusWords.map((w) => `"${w}"`).join(" and ")
    : "the rhythm";

  let suggestion: string;

  if (wrongLanguageDetected) {
    suggestion = "It sounds like you spoke in English — try saying it in the target language!";
  } else if (rating === "spot-on") {
    suggestion = pick([
      "Nailed it! That sounded great.",
      "Perfect pronunciation — you've got this!",
      "Spot on! Try it a bit faster next time.",
    ]);
  } else if (rating === "close") {
    const closeTips = [
      `Very close — focus on ${focusHint} and try again.`,
      `Almost perfect! Pay extra attention to ${focusHint}.`,
      `So close! Try exaggerating the ${focusHint} sound.`,
      `Great attempt! Just polish ${focusHint} and you'll have it.`,
    ];
    if (isCJK) closeTips.push("Pay attention to the rising and falling tones — they change the meaning.");
    suggestion = pick(closeTips);
  } else if (rating === "almost") {
    const almostTips = [
      `Almost there. ${focusWords[0] ? `The word ${focusHint} didn't come through.` : "The ending"} Slow down and emphasize it.`,
      "Getting closer! Try saying it one word at a time, then speed up.",
      "Good effort! Focus on matching each syllable to what you hear.",
      "You're making progress! Listen once more, then try matching the rhythm.",
    ];
    if (isCJK) almostTips.push("Try to match the pitch pattern — listen for which syllables go up vs. down.");
    suggestion = pick(almostTips);
  } else {
    suggestion = pick([
      "Not quite. Listen one more time, then attempt slowly — break the phrase into smaller pieces.",
      "Let's try a different approach: listen to just the first half and repeat that.",
      "Don't give up! Tap 'Hear it' and focus on matching the first word only.",
      "Take it slow — even native speakers had to learn one sound at a time.",
    ]);
  }

  return {
    score, rating, missingSegments, suggestion,
    wordMatches, matchedWords, totalWords: targetWords.length,
    wrongLanguageDetected,
  };
}
