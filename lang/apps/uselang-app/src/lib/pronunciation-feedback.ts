// ── Pronunciation feedback ────────────────────────────────────────────────
// Compares a recognized attempt against the target phrase and returns a
// human-readable score plus phrase-specific guidance.
//
// This is intentionally NOT a real phonetic scorer — that would need an
// acoustic model. What this gives the user instead:
//
//   • A character-level similarity score (0..1). The native iOS recognizer
//     already returns a transcript that's been audio-matched to the user's
//     speech, so character similarity between transcript and target is a
//     reasonable proxy for "did the syllables come through".
//
//   • A list of specific syllables / words that didn't match. The Quick
//     Tutor shows these inline so the learner sees exactly what to fix.
//
//   • A single short suggestion line that maps the score range to the kind
//     of feedback a real coach would give.
//
// We never claim "your tones were wrong" — only the bundled vision/audio
// model can judge that. The honest, helpful version of feedback is: did
// the recognizer hear the right syllables, and which ones to retry.

export interface PronunciationFeedback {
  /** 0..1 — share of the target characters that matched in the attempt. */
  score: number;
  /** Human label for the score range. */
  rating: "spot-on" | "close" | "almost" | "off";
  /** The character-segments from the target that did NOT appear in the
   *  attempt's normalized text, e.g. ["想", "去"] for a Mandarin miss. */
  missingSegments: string[];
  /** One coaching line keyed to the rating. */
  suggestion: string;
}

const PUNCT_RE = /[。．\.！?？，,;:、'"()\[\]]/g;

function normalize(text: string): string {
  return text.replace(PUNCT_RE, "").replace(/\s+/g, "").toLowerCase().trim();
}

/**
 * Score a recognized attempt against the target phrase.
 *
 * Both inputs come from the same recognizer locale so character
 * normalization is enough — we don't need a multi-locale comparison here.
 */
export function comparePronunciation(target: string, attempt: string): PronunciationFeedback {
  const t = normalize(target);
  const a = normalize(attempt);

  if (!t) {
    return {
      score: 0,
      rating: "off",
      missingSegments: [],
      suggestion: "I didn't catch the target phrase — try again.",
    };
  }
  if (!a) {
    return {
      score: 0,
      rating: "off",
      missingSegments: [...t],
      suggestion: "I didn't catch any speech. Hold the orb and try again — get close to the mic.",
    };
  }

  // Build a multiset of characters from the attempt so we can decrement as
  // we walk the target. This counts repeated characters correctly
  // ("天天" matched against "天" should report one missing 天).
  const attemptCounts = new Map<string, number>();
  for (const ch of a) attemptCounts.set(ch, (attemptCounts.get(ch) || 0) + 1);

  let matched = 0;
  const missing: string[] = [];
  for (const ch of t) {
    const left = attemptCounts.get(ch) || 0;
    if (left > 0) {
      matched += 1;
      attemptCounts.set(ch, left - 1);
    } else {
      missing.push(ch);
    }
  }

  const score = matched / t.length;
  const rating: PronunciationFeedback["rating"] =
    score >= 0.95 ? "spot-on" :
    score >= 0.75 ? "close" :
    score >= 0.50 ? "almost" : "off";

  // Deduplicate missing list while preserving order.
  const missingSegments = Array.from(new Set(missing));

  const suggestion =
    rating === "spot-on" ? "Nailed it. Move on or try a slight tone variation."
    : rating === "close"
      ? `Very close — focus on ${missingSegments.slice(0, 2).join(" / ") || "the rhythm"} and try again.`
    : rating === "almost"
      ? `Almost there. The ${missingSegments[0] ? `"${missingSegments[0]}"` : "ending"} sound didn't come through. Slow down and emphasize it.`
      : `Not quite. Listen one more time, then attempt slowly — break the phrase into smaller pieces.`;

  return { score, rating, missingSegments, suggestion };
}
