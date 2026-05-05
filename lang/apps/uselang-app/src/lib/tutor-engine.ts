// ── Tutor Engine ─────────────────────────────────────────────────────────────
// Central state machine for Learn and Speak modes. Enforces structured learning
// with strict progression: prompt → attempt → evaluation → repetition → mastery.
// NOT a chatbot. A skill acquisition engine with gating and scoring.

import { postTutorSession, type TutorRequest, type TutorResponse, type PhraseChunk } from "./tutor-api";
import { recordWeakness, getTopWeaknesses, type ErrorCategory, type WeaknessEntry } from "./weakness-store";
import { addXP, getLevel } from "./progress-store";

// ── Types ────────────────────────────────────────────────────────────────────

export type LearnStep =
  | "idle"
  | "prompting"
  | "awaiting-attempt"
  | "evaluating"
  | "correcting"
  | "repeating"
  | "mastered";

export type SpeakPhase =
  | "idle"
  | "guided-conversation"
  | "exam-mode"
  | "exam-scoring"
  | "completed";

export interface ErrorClassification {
  grammar: string | null;
  pronunciation: string | null;
  tone: string | null;
  wordChoice: string | null;
  structure: string | null;
}

export interface LearnEvaluation {
  userSaid: string;
  correctedVersion: string;
  errors: ErrorClassification;
  errorSummary: string;
  fixDrill: string;
  isCorrect: boolean;
}

export interface ExamResult {
  accuracy: number;
  fluency: number;
  pronunciation: number;
  mistakes: { category: ErrorCategory; detail: string }[];
  passed: boolean;
  unlockMessage: string | null;
}

export interface HintState {
  level: 0 | 1 | 2 | 3 | 4;
  structureHint: string;
  partialPhrase: string;
  firstWord: string;
  fullAnswer: string;
}

// ── Difficulty ───────────────────────────────────────────────────────────────

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

interface DifficultyTracker {
  level: DifficultyLevel;
  recentScores: number[];
  retryCount: number;
  consecutiveFailures: number;
}

function adjustDifficulty(tracker: DifficultyTracker): DifficultyTracker {
  const scores = tracker.recentScores.slice(-10);
  if (scores.length < 3) return tracker;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  let next = tracker.level;
  if (avg > 80 && tracker.level < 5) {
    next = (tracker.level + 1) as DifficultyLevel;
  } else if (avg < 40 && tracker.level > 1) {
    next = (tracker.level - 1) as DifficultyLevel;
  }
  return { ...tracker, level: next };
}

// ── Learn Session ────────────────────────────────────────────────────────────

export interface LearnSession {
  langCode: string;
  nativeLang: string;
  step: LearnStep;
  currentPrompt: string;
  currentTarget: string;
  evaluation: LearnEvaluation | null;
  repetitionCount: number;
  requiredRepetitions: number;
  hint: HintState;
  difficulty: DifficultyTracker;
  turnCount: number;
  totalMastered: number;
  xpEarned: number;
  lastTutorResponse: TutorResponse | null;
}

export function createLearnSession(
  langCode: string,
  nativeLang: string = "en",
): LearnSession {
  return {
    langCode,
    nativeLang,
    step: "idle",
    currentPrompt: "",
    currentTarget: "",
    evaluation: null,
    repetitionCount: 0,
    requiredRepetitions: 2,
    hint: { level: 0, structureHint: "", partialPhrase: "", firstWord: "", fullAnswer: "" },
    difficulty: { level: 2, recentScores: [], retryCount: 0, consecutiveFailures: 0 },
    turnCount: 0,
    totalMastered: 0,
    xpEarned: 0,
    lastTutorResponse: null,
  };
}

export async function learnGeneratePrompt(
  session: LearnSession,
): Promise<LearnSession> {
  const weaknesses = await getTopWeaknesses(session.langCode, 3);
  const weakBias = weaknesses.length > 0
    ? `Focus on these weak areas: ${weaknesses.map((w: WeaknessEntry) => `${w.category}: ${w.phrase}`).join(", ")}.`
    : "";

  const difficultyGuide = {
    1: "Use very simple, short sentences (3-5 words). Basic vocabulary only.",
    2: "Use simple sentences (5-8 words). Common everyday vocabulary.",
    3: "Use moderate sentences (8-12 words). Include some grammar patterns.",
    4: "Use complex sentences with subordinate clauses. Varied vocabulary.",
    5: "Use advanced, natural sentences. Idioms and cultural expressions welcome.",
  }[session.difficulty.level];

  const req: TutorRequest = {
    mode: "train",
    text: `Generate ONE sentence task for the student to translate. ${difficultyGuide} ${weakBias} Return the sentence in the user's native language as the prompt. The student must produce it in the target language. Do NOT give the answer yet.`,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
  };

  try {
    const res = await postTutorSession(req);
    const prompt = res.context || res.literalMeaning || res.repeatPrompt || "Say hello.";
    return {
      ...session,
      step: "awaiting-attempt",
      currentPrompt: prompt,
      currentTarget: res.naturalPhrase || "",
      evaluation: null,
      repetitionCount: 0,
      hint: { level: 0, structureHint: "", partialPhrase: "", firstWord: "", fullAnswer: res.naturalPhrase || "" },
      turnCount: session.turnCount + 1,
      lastTutorResponse: res,
    };
  } catch {
    return { ...session, step: "awaiting-attempt", currentPrompt: "Say hello.", turnCount: session.turnCount + 1 };
  }
}

export async function learnSubmitAttempt(
  session: LearnSession,
  userText: string,
): Promise<LearnSession> {
  if (session.step !== "awaiting-attempt" && session.step !== "repeating") {
    return session;
  }

  const req: TutorRequest = {
    mode: "train",
    text: `Evaluate this attempt. The student was asked to say: "${session.currentPrompt}". They said: "${userText}". The correct answer should be in ${session.langCode}. Grade strictly. Return correctedVersion, errorTypes (grammar, pronunciation, tone, wordChoice, structure), a 1-line explanation, and a fixDrill sentence to repeat.`,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
    attemptTranscript: userText,
    expectedPhrase: session.currentTarget,
  };

  try {
    const res = await postTutorSession(req);

    const errors = parseErrorClassification(res);
    const hasErrors = !!(errors.grammar || errors.pronunciation || errors.tone || errors.wordChoice || errors.structure);
    const isCorrect = !hasErrors && !res.correctionLine;

    const score = isCorrect ? 90 : scoreFuzzy(userText, session.currentTarget);

    const evaluation: LearnEvaluation = {
      userSaid: userText,
      correctedVersion: res.naturalPhrase || session.currentTarget,
      errors,
      errorSummary: res.correctionLine || (isCorrect ? "Correct!" : "Review the correction above."),
      fixDrill: res.repeatPrompt || res.naturalPhrase || session.currentTarget,
      isCorrect,
    };

    // Record weaknesses
    if (errors.grammar) await recordWeakness(session.langCode, "grammar", session.currentTarget, errors.grammar);
    if (errors.pronunciation) await recordWeakness(session.langCode, "pronunciation", session.currentTarget, errors.pronunciation);
    if (errors.tone) await recordWeakness(session.langCode, "tone", session.currentTarget, errors.tone);
    if (errors.wordChoice) await recordWeakness(session.langCode, "word-choice", session.currentTarget, errors.wordChoice);
    if (errors.structure) await recordWeakness(session.langCode, "structure", session.currentTarget, errors.structure);

    const diff = { ...session.difficulty, recentScores: [...session.difficulty.recentScores, score].slice(-10) };
    const adjustedDiff = adjustDifficulty(diff);

    if (isCorrect && session.step === "repeating") {
      const newCount = session.repetitionCount + 1;
      if (newCount >= session.requiredRepetitions) {
        // MASTERY
        const xpResult = await addXP(15);
        return {
          ...session,
          step: "mastered",
          evaluation,
          repetitionCount: newCount,
          difficulty: adjustedDiff,
          totalMastered: session.totalMastered + 1,
          xpEarned: session.xpEarned + 15,
          lastTutorResponse: res,
        };
      }
      return {
        ...session,
        step: "repeating",
        evaluation,
        repetitionCount: newCount,
        difficulty: adjustedDiff,
        lastTutorResponse: res,
      };
    }

    if (isCorrect) {
      // First correct attempt — enter repetition phase
      return {
        ...session,
        step: "repeating",
        evaluation,
        repetitionCount: 1,
        difficulty: { ...adjustedDiff, retryCount: 0, consecutiveFailures: 0 },
        lastTutorResponse: res,
      };
    }

    // Incorrect
    const retryCount = session.difficulty.retryCount + 1;
    const consecutiveFailures = session.difficulty.consecutiveFailures + 1;
    return {
      ...session,
      step: "correcting",
      evaluation,
      difficulty: { ...adjustedDiff, retryCount, consecutiveFailures },
      lastTutorResponse: res,
    };
  } catch {
    return { ...session, step: "awaiting-attempt" };
  }
}

export function learnRetryAfterCorrection(session: LearnSession): LearnSession {
  if (session.step !== "correcting") return session;
  return { ...session, step: "awaiting-attempt" };
}

export function learnGetHint(session: LearnSession): LearnSession {
  if (session.step !== "awaiting-attempt") return session;
  const target = session.currentTarget || session.hint.fullAnswer;
  if (!target) return session;

  const nextLevel = Math.min(4, session.hint.level + 1) as HintState["level"];
  const words = target.split(/\s+/);

  return {
    ...session,
    hint: {
      ...session.hint,
      level: nextLevel,
      structureHint: nextLevel >= 1 ? buildStructureHint(target) : "",
      partialPhrase: nextLevel >= 2 ? words.slice(0, Math.ceil(words.length / 2)).join(" ") + "…" : "",
      firstWord: nextLevel >= 3 ? (words[0] || "") : "",
      fullAnswer: nextLevel >= 4 ? target : session.hint.fullAnswer,
    },
  };
}

// ── Speak Session ────────────────────────────────────────────────────────────

export interface SpeakSession {
  langCode: string;
  nativeLang: string;
  scenario: string;
  phase: SpeakPhase;
  turnCount: number;
  maxTurnsBeforeExam: number;
  conversationHistory: { role: "user" | "ai"; text: string; phonetic?: string }[];
  examTask: { direction: "en-to-target" | "target-to-en"; prompt: string } | null;
  examResult: ExamResult | null;
  lastTutorResponse: TutorResponse | null;
}

export function createSpeakSession(
  langCode: string,
  nativeLang: string = "en",
  scenario: string = "everyday conversation",
): SpeakSession {
  return {
    langCode,
    nativeLang,
    scenario,
    phase: "idle",
    turnCount: 0,
    maxTurnsBeforeExam: 5 + Math.floor(Math.random() * 6), // 5-10
    conversationHistory: [],
    examTask: null,
    examResult: null,
    lastTutorResponse: null,
  };
}

export async function speakStart(session: SpeakSession): Promise<SpeakSession> {
  const req: TutorRequest = {
    mode: "conversation",
    text: `Start a guided conversation. Scenario: ${session.scenario}. Greet the user in character and set the scene. Use simple ${session.langCode} vocabulary the user has likely learned. Stay in the scenario.`,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
    scenario: session.scenario,
  };

  try {
    const res = await postTutorSession(req);
    return {
      ...session,
      phase: "guided-conversation",
      turnCount: 1,
      conversationHistory: [{ role: "ai", text: res.localReply || res.naturalPhrase || "Hello!", phonetic: res.phonetic || undefined }],
      lastTutorResponse: res,
    };
  } catch {
    return { ...session, phase: "guided-conversation", turnCount: 1 };
  }
}

export async function speakSubmitTurn(
  session: SpeakSession,
  userText: string,
): Promise<SpeakSession> {
  if (session.phase === "exam-mode") {
    return speakSubmitExam(session, userText);
  }

  if (session.phase !== "guided-conversation") return session;

  const newTurn = session.turnCount + 1;
  const history = [...session.conversationHistory, { role: "user" as const, text: userText }];

  // Check if we should trigger exam
  if (newTurn >= session.maxTurnsBeforeExam) {
    return speakTriggerExam({ ...session, turnCount: newTurn, conversationHistory: history });
  }

  const req: TutorRequest = {
    mode: "conversation",
    text: userText,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
    scenario: session.scenario,
  };

  try {
    const res = await postTutorSession(req);
    const aiReply = res.localReply || res.naturalPhrase || "";
    return {
      ...session,
      turnCount: newTurn,
      conversationHistory: [...history, { role: "ai", text: aiReply, phonetic: res.phonetic || undefined }],
      lastTutorResponse: res,
    };
  } catch {
    return { ...session, turnCount: newTurn, conversationHistory: history };
  }
}

async function speakTriggerExam(session: SpeakSession): Promise<SpeakSession> {
  const direction: "en-to-target" | "target-to-en" = Math.random() > 0.5 ? "en-to-target" : "target-to-en";

  const req: TutorRequest = {
    mode: "train",
    text: direction === "en-to-target"
      ? `Generate an exam question: Give ONE English sentence related to the scenario "${session.scenario}" that the student must translate into the target language. Use vocabulary from the conversation.`
      : `Generate an exam question: Give ONE sentence in the target language related to "${session.scenario}" that the student must translate into English. Use vocabulary from the conversation.`,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
    scenario: session.scenario,
  };

  try {
    const res = await postTutorSession(req);
    const prompt = direction === "en-to-target"
      ? (res.context || res.literalMeaning || "How do you greet someone?")
      : (res.naturalPhrase || "Hello");

    return {
      ...session,
      phase: "exam-mode",
      examTask: { direction, prompt },
      lastTutorResponse: res,
    };
  } catch {
    return {
      ...session,
      phase: "exam-mode",
      examTask: { direction, prompt: "Say hello." },
    };
  }
}

async function speakSubmitExam(
  session: SpeakSession,
  userText: string,
): Promise<SpeakSession> {
  if (!session.examTask) return session;

  const req: TutorRequest = {
    mode: "train",
    text: `EXAM SCORING. Task: ${session.examTask.direction === "en-to-target" ? "Translate to target language" : "Translate to English"}. Prompt: "${session.examTask.prompt}". Student answer: "${userText}". Score accuracy (0-100), fluency (0-100), pronunciation estimate (0-100). List mistakes by category. Verdict: Pass (avg >= 60) or Fail.`,
    languageCode: session.langCode,
    nativeLanguageCode: session.nativeLang,
    attemptTranscript: userText,
  };

  try {
    const res = await postTutorSession(req);
    const errors = parseErrorClassification(res);
    const mistakes: { category: ErrorCategory; detail: string }[] = [];
    if (errors.grammar) mistakes.push({ category: "grammar", detail: errors.grammar });
    if (errors.pronunciation) mistakes.push({ category: "pronunciation", detail: errors.pronunciation });
    if (errors.tone) mistakes.push({ category: "tone", detail: errors.tone });
    if (errors.wordChoice) mistakes.push({ category: "word-choice", detail: errors.wordChoice });
    if (errors.structure) mistakes.push({ category: "structure", detail: errors.structure });

    const score = scoreFuzzy(userText, res.naturalPhrase || session.examTask.prompt);
    const passed = score >= 60;

    if (passed) {
      await addXP(25);
    }

    // Record weaknesses from exam
    for (const m of mistakes) {
      await recordWeakness(session.langCode, m.category, session.examTask.prompt, m.detail);
    }

    const result: ExamResult = {
      accuracy: Math.min(100, score + (mistakes.length === 0 ? 10 : 0)),
      fluency: Math.max(30, score - mistakes.length * 5),
      pronunciation: Math.max(20, score - (errors.pronunciation ? 20 : 0) - (errors.tone ? 15 : 0)),
      mistakes,
      passed,
      unlockMessage: passed
        ? `You can now use this in a real-life ${session.scenario} situation.`
        : null,
    };

    return {
      ...session,
      phase: "exam-scoring",
      examResult: result,
      lastTutorResponse: res,
    };
  } catch {
    return { ...session, phase: "exam-scoring", examResult: {
      accuracy: 0, fluency: 0, pronunciation: 0, mistakes: [], passed: false, unlockMessage: null,
    }};
  }
}

export function speakFinish(session: SpeakSession): SpeakSession {
  return { ...session, phase: "completed" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseErrorClassification(res: TutorResponse): ErrorClassification {
  const correction = (res.correctionLine || "").toLowerCase();
  const tip = (res.pronunciationTip || "").toLowerCase();
  const context = (res.context || "").toLowerCase();
  const combined = `${correction} ${tip} ${context}`;

  return {
    grammar: combined.includes("grammar") || combined.includes("conjugat") || combined.includes("tense")
      ? res.correctionLine || null : null,
    pronunciation: combined.includes("pronunciat") || combined.includes("sound") || combined.includes("phonet")
      ? res.pronunciationTip || res.correctionLine || null : null,
    tone: combined.includes("tone") || combined.includes("tōn") || combined.includes("声调")
      ? res.pronunciationTip || res.correctionLine || null : null,
    wordChoice: combined.includes("word choice") || combined.includes("vocabulary") || combined.includes("wrong word")
      ? res.correctionLine || null : null,
    structure: combined.includes("structure") || combined.includes("word order") || combined.includes("syntax")
      ? res.correctionLine || null : null,
  };
}

function scoreFuzzy(attempt: string, target: string): number {
  if (!attempt || !target) return 0;
  const a = attempt.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (a === t) return 95;

  // Simple character overlap scoring
  const aChars = new Set(a.split(""));
  const tChars = new Set(t.split(""));
  let overlap = 0;
  for (const c of aChars) { if (tChars.has(c)) overlap++; }
  const maxLen = Math.max(aChars.size, tChars.size);
  const charScore = maxLen > 0 ? (overlap / maxLen) * 100 : 0;

  // Word overlap
  const aWords = new Set(a.split(/\s+/));
  const tWords = new Set(t.split(/\s+/));
  let wordOverlap = 0;
  for (const w of aWords) { if (tWords.has(w)) wordOverlap++; }
  const maxWords = Math.max(aWords.size, tWords.size);
  const wordScore = maxWords > 0 ? (wordOverlap / maxWords) * 100 : 0;

  return Math.round((charScore * 0.4 + wordScore * 0.6));
}

function buildStructureHint(target: string): string {
  const words = target.split(/\s+/);
  return words.map((w, i) => (i === 0 ? w[0] + "_".repeat(w.length - 1) : "_".repeat(w.length))).join(" ");
}

// ── Phrase Session (Chunk-by-Chunk mode) ────────────────────────────────────

export type PhrasePhase = "loading" | "intro" | "practicing" | "final" | "scenario" | "remediate" | "done" | "completed";

export interface PhraseSession {
  phase: PhrasePhase;
  originalPhrase: string;
  fullTarget: string;
  fullPhonetic: string;
  context: string;
  chunks: PhraseChunk[];
  currentChunkIndex: number;
  /** Best score per chunk (0..1). undefined = not yet attempted. */
  chunkScores: (number | undefined)[];
  /** Whether each chunk has been mastered (score >= threshold). */
  chunkMastered: boolean[];
  /** The final full-sentence attempt score, if attempted. */
  finalScore?: number;
  /** Scenario test prompt from AI (e.g. "You're at a taxi stand. The driver asks '去哪里？'"). */
  scenarioPrompt?: string;
  /** Score from the scenario test attempt. */
  scenarioScore?: number;
  languageCode: string;
  nativeLanguageCode: string;
}

const PHRASE_MASTERY_THRESHOLD = 0.80;

export function createPhraseSession(
  originalPhrase: string,
  res: TutorResponse,
  languageCode: string,
  nativeLanguageCode: string,
): PhraseSession {
  const chunks = res.chunks ?? [];
  return {
    phase: chunks.length > 0 ? "intro" : "completed",
    originalPhrase,
    fullTarget: res.naturalPhrase || "",
    fullPhonetic: res.phonetic || "",
    context: res.context || "",
    chunks,
    currentChunkIndex: 0,
    chunkScores: chunks.map(() => undefined),
    chunkMastered: chunks.map(() => false),
    languageCode,
    nativeLanguageCode,
  };
}

export function phraseAdvanceFromIntro(session: PhraseSession): PhraseSession {
  return { ...session, phase: "practicing" };
}

export function phraseAdvanceToScenario(session: PhraseSession, scenarioPrompt: string): PhraseSession {
  return { ...session, phase: "scenario", scenarioPrompt };
}

export function phraseScoreScenario(session: PhraseSession, score: number): PhraseSession {
  if (score >= PHRASE_MASTERY_THRESHOLD) {
    return { ...session, scenarioScore: score, phase: "done" };
  }
  return { ...session, scenarioScore: score, phase: "remediate" };
}

export function phraseAdvanceFromRemediate(session: PhraseSession): PhraseSession {
  // Find the weakest chunk (lowest score) and loop the user back to practice it
  let weakestIdx = 0;
  let weakestScore = Infinity;
  for (let i = 0; i < session.chunks.length; i++) {
    const s = session.chunkScores[i] ?? 0;
    if (s < weakestScore) {
      weakestScore = s;
      weakestIdx = i;
    }
  }
  // Reset mastery on the weak chunk so the user must re-practice it
  const mastered = [...session.chunkMastered];
  mastered[weakestIdx] = false;
  return {
    ...session,
    phase: "practicing",
    currentChunkIndex: weakestIdx,
    chunkMastered: mastered,
  };
}

export function phraseScoreChunk(
  session: PhraseSession,
  chunkIndex: number,
  score: number,
): PhraseSession {
  const scores = [...session.chunkScores];
  const mastered = [...session.chunkMastered];

  // Keep best score
  scores[chunkIndex] = Math.max(score, scores[chunkIndex] ?? 0);
  mastered[chunkIndex] = scores[chunkIndex]! >= PHRASE_MASTERY_THRESHOLD;

  const allMastered = mastered.every(Boolean);
  const nextIndex = mastered[chunkIndex]
    ? mastered.findIndex((m, i) => !m && i > chunkIndex) !== -1
      ? mastered.findIndex((m, i) => !m && i > chunkIndex)
      : allMastered ? session.chunks.length : session.currentChunkIndex
    : chunkIndex;

  return {
    ...session,
    chunkScores: scores,
    chunkMastered: mastered,
    currentChunkIndex: allMastered ? session.currentChunkIndex : nextIndex,
    phase: allMastered ? "final" : "practicing",
  };
}

export function phraseScoreFinal(session: PhraseSession, score: number): PhraseSession {
  // Only advance to scenario once the full sentence is mastered; otherwise stay in "final" to retry
  const phase = score >= PHRASE_MASTERY_THRESHOLD ? "scenario" : "final";
  return { ...session, finalScore: score, phase };
}

export function getPhraseProgress(session: PhraseSession): { mastered: number; total: number } {
  return {
    mastered: session.chunkMastered.filter(Boolean).length,
    total: session.chunks.length,
  };
}

export { PHRASE_MASTERY_THRESHOLD };
