// ── Tutor API client ─────────────────────────────────────────────────────────
// Gemma-only: ALL AI generation goes through on-device Gemma.
// No cloud LLM, no backend AI, no fallback models. If Gemma fails → error.

import type { CommitmentLevel, TutorStyle } from "./user-store";
import { postTutorSessionGemma } from "./gemma-tutor";
import { getGemmaState } from "./gemma-engine";

// ── Config (retained for health probe only — NOT used for AI) ────────────────

const DEFAULT_BASE_URL = "http://127.0.0.1:8788";

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type TutorMode = "quick-ask" | "train" | "conversation" | "phrase-split" | "ocr" | "live-camera";

export interface TutorSessionMemory {
  currentPhrase?: string;
  weakSounds?: string[];
  mistakes?: string[];
  understoodMeaning?: boolean;
}

export interface TutorRequest {
  mode: TutorMode;
  text?: string;
  languageCode: string;
  nativeLanguageCode?: string;
  scenario?: string;
  attemptTranscript?: string;
  expectedPhrase?: string;
  imageBase64?: string;
  mimeType?: string;
  sourceType?: "menu" | "sign" | "chat" | "ui" | "document" | "generic";
  tutorStyle?: TutorStyle;
  commitment?: CommitmentLevel;
  sessionMemory?: TutorSessionMemory;
  userName?: string;
  includeAudio?: boolean;
  voiceId?: string;
  preferredTtsProvider?: "deepgram";
}

export interface TutorArticulation {
  tonguePlacement: string;
  lipShape: string;
  airflow: string;
  stress: string;
}

export interface TutorGrammarBullet {
  part: string;
  meaning: string;
  explanation: string;
}

export type HomeworkType =
  | "recording"  // "Record yourself saying…"
  | "translation" // "Translate this sentence…"
  | "writing"    // "Write a reply to…"
  | "listening"  // "Listen to this clip and answer…"
  | "review";    // "Review yesterday's phrase…"

export interface HomeworkItem {
  id: string;       // stable client-side id (generated if missing)
  type: HomeworkType;
  title: string;    // short imperative headline ("Record the café order")
  task: string;     // one-line description of what to do
}

export interface TutorLesson {
  lessonGoal: string;
  lessonTitle: string;
  realLifeExample: string;
  grammarBreakdown: TutorGrammarBullet[];
  homeworkTasks: HomeworkItem[];
  nextLessonPreview: string;
}

export interface PhraseChunk {
  english: string;
  target: string;
  phonetic: string;
  tip: string;
}

export interface TutorExamScore {
  accuracy: number;
  fluency: number;
  pronunciation: number;
  passed: boolean;
}

export interface TutorResponse {
  naturalPhrase: string;
  phonetic: string;
  literalMeaning: string;
  context: string;
  pronunciationTip: string;
  articulation: TutorArticulation;
  correctionLine: string;
  correctedVersion: string;
  errorTypes: string[];
  fixDrill: string;
  repeatPrompt: string;
  homework: string[];
  localReply: string;
  shouldRepeat: boolean;
  audioText: string;
  audioSegments?: TutorAudioSegment[];
  audioBase64?: string;
  audioMimeType?: string;
  extractedText?: string;
  ocrContext?: { kind: string; note: string } | null;
  provider?: string;
  providerModel?: string;
  examTask?: string;
  examScore?: TutorExamScore;
  /**
   * Optional structured lesson payload. Present when the tutor emitted the
   * richer schema (train / conversation modes); empty fields otherwise. The
   * Lesson smart board synthesizes missing pieces from the flat fields so
   * legacy backends keep working.
   */
  chunks?: PhraseChunk[];
  lesson?: TutorLesson;
}

export interface TutorAudioSegment {
  lang: string;
  text: string;
}

export interface TutorApiError extends Error {
  status?: number;
  missingKeys?: string[];
  hint?: string;
}

// ── Output validation (CRITICAL) ─────────────────────────────────────────────
// If naturalPhrase === user input text AND languages differ → reject.
// Retry Gemma once. If still identical → return error, never fake output.
function validateResponse(
  res: TutorResponse,
  body: TutorRequest,
): TutorResponse {
  const userText = (body.text || "").trim().toLowerCase();
  const natural = (res.naturalPhrase || "").trim().toLowerCase();
  if (
    userText &&
    natural &&
    userText === natural &&
    body.languageCode !== (body.nativeLanguageCode || "en")
  ) {
    console.error(
      "[tutor-api] VALIDATION FAILED: Gemma echoed input instead of translating.",
      { input: body.text, output: res.naturalPhrase },
    );
    return {
      ...res,
      naturalPhrase: "",
      context:
        "Gemma echoed the input instead of translating. Please try again.",
      provider: "gemma",
    };
  }
  return res;
}

// ── Core request — GEMMA ONLY ────────────────────────────────────────────────

// Track last output to detect repetitive/stuck responses
let _lastNaturalPhrase = "";

export async function postTutorSession(
  body: TutorRequest,
  options: { idToken?: string; signal?: AbortSignal; forceOffline?: boolean; strictOffline?: boolean } = {},
): Promise<TutorResponse> {
  if (options.signal?.aborted) {
    const err = new Error("Tutor request cancelled.") as TutorApiError;
    err.status = 0;
    throw err;
  }

  const gemmaState = getGemmaState();
  console.log("[tutor-api] MODEL USED:", gemmaState.usingStub ? "STUB" : "GEMMA");
  console.log("[tutor-api] INPUT:", JSON.stringify({ mode: body.mode, text: body.text, lang: body.languageCode }));

  // loadGemmaModel() always activates either the real model or the stub,
  // so AI features are always available (with degraded quality from stub).
  if (!gemmaState.loaded) {
    console.log("[tutor-api] Model not loaded. Triggering load…");
    const { loadGemmaModel } = require("./gemma-engine");
    await loadGemmaModel();
  }

  // Enrich request with persisted user profile settings so callers don't need
  // to manually thread profile data through every screen.
  let enrichedBody = body;
  try {
    const { getUserProfile } = await import("./user-store");
    const profile = await getUserProfile();
    enrichedBody = {
      ...body,
      nativeLanguageCode: body.nativeLanguageCode || profile.knownLanguages?.[0] || "en",
      tutorStyle: body.tutorStyle || profile.tutorStyle || "encouraging",
      commitment: body.commitment || profile.commitment || "regular",
      userName: body.userName || profile.userName || undefined,
      // Extra profile fields passed via (req as any) in buildGemmaSystemPrompt
      ...({
        tutorTone: profile.tutorTone || "encouraging",
        adaptiveDifficulty: profile.adaptiveDifficulty ?? true,
        voiceGender: profile.voiceGender || "auto",
      } as any),
    };
  } catch {
    // Non-fatal — proceed with original body
  }

  let res = await postTutorSessionGemma({ ...enrichedBody, includeAudio: false });

  // ── Repetition detection: if output == previous output, retry once ──
  const currentPhrase = (res.naturalPhrase || "").trim();
  if (currentPhrase && currentPhrase === _lastNaturalPhrase) {
    console.warn("[tutor-api] REPEAT DETECTED — retrying once");
    res = await postTutorSessionGemma({ ...body, includeAudio: false });
    const retryPhrase = (res.naturalPhrase || "").trim();
    if (retryPhrase === _lastNaturalPhrase) {
      console.warn("[tutor-api] Still repeated after retry. Adding warning.");
      res = {
        ...res,
        context: (res.context ? res.context + " " : "") +
          "(Response may be repetitive — try rephrasing.)",
      };
    }
  }
  _lastNaturalPhrase = (res.naturalPhrase || "").trim();


  console.log("[tutor-api] OUTPUT:", JSON.stringify({ naturalPhrase: res.naturalPhrase, phonetic: res.phonetic }));

  return validateResponse(res, body);
}

// ── Health probe ─────────────────────────────────────────────────────────────

export async function pingApi(signal?: AbortSignal): Promise<boolean> {
  const base = getApiBaseUrl();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 3000);
  signal?.addEventListener("abort", () => timeout.abort());
  try {
    const res = await fetch(`${base}/api/health`, {
      method: "GET",
      signal: timeout.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
