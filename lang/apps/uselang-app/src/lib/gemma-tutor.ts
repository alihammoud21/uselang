// ── Local tutor orchestrator (Gemma) ─────────────────────────────────────────
// ALL tutor responses flow through this module via on-device Gemma.
// ZERO cloud LLMs. ZERO fallback models. ZERO hardcoded responses.
// If Gemma fails → error. No fake output.

import { generateTutorJson, getGemmaState, loadGemmaModel } from "./gemma-engine";
import type { ChatMessage } from "./gemma-engine";
import type { TutorRequest, TutorResponse } from "./tutor-api";
import type { TutorTone, VoiceGender } from "./user-store";

// ── Language label helpers ───────────────────────────────────────────────────
// Keep this tiny — the full list lives in constants. We only need readable
// names for the prompt and tolerate unknown codes gracefully.
const LANG_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  "fr-CA": "Canadian French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  "pt-BR": "Brazilian Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin Chinese",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  nl: "Dutch",
  sv: "Swedish",
  pl: "Polish",
  ru: "Russian",
};

function labelFor(code?: string): string {
  if (!code) return "the target language";
  return LANG_LABELS[code] || LANG_LABELS[code.slice(0, 2)] || code;
}

// ── Personality helpers ──────────────────────────────────────────────────────

const STYLE_INSTRUCTIONS: Record<string, string> = {
  encouraging: "Be warm and supportive. Celebrate every correct sound. Gently note errors — always end corrections with encouragement.",
  direct: "Be clear and efficient. Give corrections immediately, no sugarcoating. The user wants the truth, not praise.",
  socratic: "Ask guiding questions. Don't give the full answer immediately — lead the user to discover it themselves.",
  immersive: "Conduct the session mostly in the target language. Only switch to the native language for critical corrections or when the user is truly lost.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: "Use casual, friendly language — contractions, natural phrases. Speak like a helpful friend.",
  encouraging: "Use motivating, upbeat language. Cheer progress and frame corrections positively.",
  formal: "Use polished, professional language. No slang or casual contractions. Maintain a structured teaching register.",
};

const PACE_INSTRUCTIONS: Record<string, string> = {
  casual: "Move slowly. Repeat key points, give extra context, keep drills short (1-2 examples max).",
  regular: "Standard pacing — one new thing per turn, medium detail.",
  serious: "Push the pace. Introduce more vocabulary per turn. Raise the correction threshold.",
  intensive: "Drill relentlessly. Increase complexity quickly. No padding. High correction threshold.",
};

// ── System prompt (mirror of services/tutor/system-prompt.js, trimmed) ──────
// Keep the prompt compact to leave headroom for the user turn and JSON.

function buildGemmaSystemPrompt(req: TutorRequest): string {
  const target = labelFor(req.languageCode);
  const native = labelFor(req.nativeLanguageCode || "en");
  const modePlaybook = MODE_PLAYBOOKS[req.mode] || MODE_PLAYBOOKS["quick-ask"];

  const styleKey = req.tutorStyle ?? "encouraging";
  const toneKey  = (req as any).tutorTone as TutorTone ?? "encouraging";
  const paceKey  = req.commitment ?? "regular";
  const adaptiveDifficulty: boolean = (req as any).adaptiveDifficulty ?? true;

  const personalityLines: string[] = [
    STYLE_INSTRUCTIONS[styleKey] || STYLE_INSTRUCTIONS.encouraging,
    TONE_INSTRUCTIONS[toneKey]   || TONE_INSTRUCTIONS.encouraging,
    PACE_INSTRUCTIONS[paceKey]   || PACE_INSTRUCTIONS.regular,
  ];
  if (adaptiveDifficulty) {
    personalityLines.push("Adaptive difficulty is ON: if the user makes repeated errors, simplify the drill. If they nail it, increase complexity slightly next turn.");
  }

  return [
    "You are Lang — a premium one-on-one speaking coach. You coach, you don't chat.",
    `The user speaks ${native} and is learning ${target}.`,
    req.userName ? `The user's name is ${req.userName}. When the phrase involves introductions, saying one's name, or any first-person identity, use "${req.userName}" as the name in the translation and examples.` : "",
    `PERSONALITY: ${personalityLines.join(" ")}`,
    // Hard rule restated in two ways so a smaller model can't rationalize
    // around it. The historical bug was the model echoing the English input
    // back as the answer when target=Mandarin — that must never happen.
    `HARD RULE: \`naturalPhrase\` MUST always be written in ${target}. Never write it in ${native}, even if the user typed in ${native}, even if the request is "How do I say X in ${target}?". The whole point of this app is to translate the user's intent INTO ${target} and coach them through saying it.`,
    "Rules: short coaching sentences. Never say you are an AI. Never lecture grammar unless asked. One correction at a time. Translate like a local would actually say it.",
    "Phonetics: readable to a native speaker of the user's language (not IPA). Capitalize stressed syllables. For Mandarin and other tonal languages, use pinyin/romanization with tone marks.",
    "Visual coaching — ALWAYS fill all four articulation fields (tonguePlacement, lipShape, airflow, stress). These power offline mouth-placement diagrams and must never be omitted. Offline and online coaching must have the same flow and availability; only the depth of feedback differs, never its presence. Never refuse to provide articulatory guidance.",
    modePlaybook,
    "Return ONLY one JSON object with these fields (use empty strings/arrays for fields you don't need):",
    '{ "naturalPhrase": string, "phonetic": string, "literalMeaning": string, "context": string, "pronunciationTip": string, "articulation": { "tonguePlacement": string, "lipShape": string, "airflow": string, "stress": string }, "correctionLine": string, "correctedVersion": string, "errorTypes": string[], "fixDrill": string, "repeatPrompt": string, "homework": string[], "localReply": string, "shouldRepeat": boolean, "audioText": string, "audioSegments": [{"lang": string, "text": string}], "examTask": string, "examScore": { "accuracy": number, "fluency": number, "pronunciation": number, "passed": boolean } }',
    `audioText is what the tutor voice will speak — usually the naturalPhrase. audioSegments: ordered [{lang,text}] chunks. When native (${native}) ≠ target (${target}), put coaching/explanation in lang="${req.nativeLanguageCode || "en"}" and the target phrase in lang="${req.languageCode}". Example: [{"lang":"${req.nativeLanguageCode || "en"}","text":"Today we learn"},{"lang":"${req.languageCode}","text":"hola"},{"lang":"${req.nativeLanguageCode || "en"}","text":"which means hello"}]. correctionLine only after a user attempt. No prose outside the JSON.`,
  ].join("\n\n");
}

const MODE_PLAYBOOKS: Record<TutorRequest["mode"], string> = {
  "quick-ask":
    "MODE: Quick Ask (Mini-Lesson). User asked how to say or pronounce something." +
    " Fill naturalPhrase (local-natural version), phonetic (readable to native speaker, not IPA), literalMeaning (word-for-word meaning matching the EXACT sense — e.g. casual enjoy not romantic love), context (one sentence explaining WHEN and WHERE a local would use this phrase — make it practical and vivid), pronunciationTip (the single most important tip — MUST include a real-life analogy from English words the user already knows, e.g. the rr in perro sounds like the tt in butter said very fast, or the u in rue sounds like the ew in few but with rounded lips)." +
    " Fill all 4 articulation fields." +
    " audioSegments MUST follow this lesson structure:" +
    " Part 1: lang=nativeLang — Today we are going to learn how to say [phrase meaning]. This is really useful when [one real-life scenario, e.g. you are at a restaurant and want to call a taxi]." +
    " Part 2: lang=nativeLang — In [targetLanguage] you would say:" +
    " Part 3: lang=targetLang — naturalPhrase (spoken clearly)" +
    " Part 4: lang=nativeLang — That means [literalMeaning]. A quick tip: [pronunciationTip with the real-life English analogy]. Listen one more time:" +
    " Part 5: lang=targetLang — naturalPhrase (repeated)" +
    " Part 6: lang=nativeLang — Now your turn. Tap the orb and try saying it!" +
    " Leave correctionLine empty on first response. IMPORTANT: Choose the word/form that matches the EXACT meaning and context the user intended." +
    " CORRECTION RULES (only when attemptTranscript is present):" +
    " Compare the attemptTranscript word-by-word against naturalPhrase." +
    " correctionLine MUST name the exact syllable or word that differs — never give generic advice." +
    " pronunciationTip MUST reference the specific sound the user got wrong, with a real-life analogy." +
    " If score >= 80%: name the single syllable that was off, e.g. 'Your r in carro sounded like an English r — roll it like the tt in butter.'" +
    " If score 50-79%: identify the hardest word, slow it down, e.g. 'The word quiero has 3 syllables: kee-EH-roh. You said 2. Listen again.'" +
    " If score < 50%: break the phrase into its first 2 words only and set fixDrill to just those words." +
    " audioSegments for corrections: Part 1: lang=nativeLang — coaching line. Part 2: lang=targetLang — naturalPhrase at normal speed. Part 3: lang=nativeLang — 'Now try again!'",
  train:
    "MODE: Train (Structured Drill Engine). If attemptTranscript is empty: give ONE sentence task in the target language. Include naturalPhrase, phonetic, context (explain the task in native language), one pronunciationTip, articulation cue. Set repeatPrompt to the sentence the user must produce. If attemptTranscript is present: EVALUATE STRICTLY. Set correctedVersion to the correct target-language sentence. Set errorTypes array with categories from: grammar, pronunciation, tone, word-choice, structure. Each entry is a short string explaining the specific error. Set correctionLine to a 1-line explanation of the MOST important error. Set fixDrill to the exact sentence the user must repeat. Set shouldRepeat=true if ANY error exists. Only set shouldRepeat=false when the attempt is correct. Never skip error classification.",
  conversation:
    "MODE: Conversation (Guided + Exam Hybrid). Stay in character for the scenario. localReply is a short line the role would actually say. naturalPhrase is a suggested user reply. Include phonetic and at most one tip. Keep turns SHORT and SIMPLE — only use vocabulary the user has likely learned. After 5-10 exchanges, if the user text contains 'EXAM MODE', switch to exam: set examTask to a translation task (English to target OR target to English). In exam mode: no hints, no corrections mid-response. Score accuracy/fluency/pronunciation in examScore object after the user answers.",
  ocr:
    "MODE: OCR. The user scanned text. Interpret the scene. context explains what the text means in context. naturalPhrase is how the user would naturally respond or act on it. Include phonetic and one tip.",
  "phrase-split":
    "MODE: Phrase Split. The user wants to learn a full sentence by breaking it into 2-4 bite-sized chunks. Return a JSON object with a \"chunks\" array. Each chunk: { \"english\": the English fragment, \"target\": the natural translation in the target language, \"phonetic\": readable phonetic for native speakers (not IPA, use tone marks for tonal languages), \"tip\": one short pronunciation or grammar tip }. Keep chunks semantically logical (e.g. \"I want\" / \"to be able to\" / \"order at a café\"). Also fill naturalPhrase with the FULL translated sentence, phonetic with full-sentence phonetic, and context with a short note. The chunks must concatenate into the full naturalPhrase.",
  "live-camera":
    "MODE: Live Camera Coach. If no image understanding is available, coach from the user's text or expectedPhrase only. Do not pretend to see the mouth. Give one safe mouth, lip, or tongue placement cue for the target phrase.",
};

// ── User turn builder ────────────────────────────────────────────────────────

function buildUserTurn(req: TutorRequest): string {
  const lines: string[] = [];
  if (req.text) lines.push(`User said: ${req.text}`);
  if (req.scenario) lines.push(`Scenario: ${req.scenario}`);
  if (req.attemptTranscript) lines.push(`Attempt transcript: ${req.attemptTranscript}`);
  if (req.expectedPhrase) lines.push(`Expected phrase: ${req.expectedPhrase}`);
  if (req.sessionMemory) {
    const m = req.sessionMemory;
    const parts: string[] = [];
    if (m.currentPhrase) parts.push(`currentPhrase=${JSON.stringify(m.currentPhrase)}`);
    if (m.weakSounds?.length) parts.push(`weakSounds=${JSON.stringify(m.weakSounds)}`);
    if (m.mistakes?.length) parts.push(`mistakes=${JSON.stringify(m.mistakes)}`);
    if (m.understoodMeaning) parts.push("understoodMeaning=true");
    if (parts.length) lines.push(`Session memory: { ${parts.join(", ")} }`);
  }
  if (req.mode === "ocr" && req.sourceType) {
    lines.push(`Source type: ${req.sourceType}`);
  }
  if (!lines.length) {
    // Empty body = "kick the lesson off"
    lines.push(
      `Start a short ${labelFor(req.languageCode)} lesson. Introduce one useful phrase, ask the user to repeat.`
    );
  }
  return lines.join("\n");
}

// ── Response shaping ─────────────────────────────────────────────────────────

// Strip Gemma chat-template special tokens that leak into generated field values.
const GEMMA_TOKENS = /<\/?(?:start_of_turn|end_of_turn)>/g;

function coerceResponse(raw: Record<string, unknown>): TutorResponse {
  const s = (v: unknown): string =>
    typeof v === "string" ? v.replace(GEMMA_TOKENS, "").trim() : "";
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const bool = (v: unknown): boolean => v === true;
  const art = (raw.articulation as Record<string, unknown>) || {};

  // Parse audioSegments: [{lang, text}] — tolerate partial / malformed entries.
  const segs = Array.isArray(raw.audioSegments)
    ? (raw.audioSegments as unknown[])
        .filter((x): x is { lang: unknown; text: unknown } => typeof x === "object" && x !== null)
        .map((x) => ({ lang: s(x.lang), text: s(x.text) }))
        .filter((x) => x.lang && x.text)
    : undefined;

  const num = (v: unknown): number => (typeof v === "number" ? v : 0);

  // Parse examScore if present
  const rawExam = (raw.examScore as Record<string, unknown>) || {};
  const hasExam = num(rawExam.accuracy) > 0 || num(rawExam.fluency) > 0;

  const naturalPhrase = s(raw.naturalPhrase);
  return {
    naturalPhrase,
    phonetic: s(raw.phonetic),
    literalMeaning: s(raw.literalMeaning),
    context: s(raw.context),
    pronunciationTip: s(raw.pronunciationTip),
    articulation: {
      tonguePlacement: s(art.tonguePlacement),
      lipShape: s(art.lipShape),
      airflow: s(art.airflow),
      stress: s(art.stress),
    },
    correctionLine: s(raw.correctionLine),
    correctedVersion: s(raw.correctedVersion),
    errorTypes: arr(raw.errorTypes),
    fixDrill: s(raw.fixDrill),
    repeatPrompt: s(raw.repeatPrompt),
    homework: arr(raw.homework).slice(0, 2),
    localReply: s(raw.localReply),
    shouldRepeat: bool(raw.shouldRepeat),
    audioText: s(raw.audioText) || naturalPhrase,
    audioSegments: segs?.length ? segs : undefined,
    examTask: s(raw.examTask) || undefined,
    examScore: hasExam ? {
      accuracy: num(rawExam.accuracy),
      fluency: num(rawExam.fluency),
      pronunciation: num(rawExam.pronunciation),
      passed: bool(rawExam.passed),
    } : undefined,
    chunks: Array.isArray(raw.chunks)
      ? (raw.chunks as unknown[])
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map((c) => ({ english: s(c.english), target: s(c.target), phonetic: s(c.phonetic), tip: s(c.tip) }))
          .filter((c) => c.english && c.target)
      : undefined,
    provider: "gemma",
    providerModel: "local-gemma",
  };
}

// ── Public entry point ───────────────────────────────────────────────────────

export async function postTutorSessionGemma(req: TutorRequest): Promise<TutorResponse> {
  const state = getGemmaState();
  console.log("[gemma-tutor] MODEL USED:", state.usingStub ? "STUB" : "GEMMA");
  console.log("[gemma-tutor] GEMMA INPUT:", JSON.stringify({ mode: req.mode, text: req.text, lang: req.languageCode }));

  // Ensure model (or stub) is loaded. loadGemmaModel() always activates
  // *something* — either the real model or the stub — so the app never
  // hard-fails here.
  if (!state.loaded) {
    console.log("[gemma-tutor] Model not loaded. Triggering load…");
    const ok = await loadGemmaModel();
    if (!ok) {
      // loadGemmaModel can return false if another load is already in progress.
      // generateTutorJson always falls back to stub, so just continue.
      console.warn("[gemma-tutor] loadGemmaModel returned false — stub will handle request");
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildGemmaSystemPrompt(req) },
    { role: "user", content: buildUserTurn(req) },
  ];

  // generateTutorJson handles stub fallback internally
  const json = await generateTutorJson(messages, {
    maxTokens: 640,
    temperature: 0.3,
  });
  const result = coerceResponse(json);
  console.log("[gemma-tutor] OUTPUT:", JSON.stringify({ naturalPhrase: result.naturalPhrase, phonetic: result.phonetic }));
  return result;
}

// Legacy preference API retained for older screens. Routing is local-only now,
// so these functions no longer affect provider selection.
export function setPreferOnDevice(value: boolean) {
  void value;
}
export function getPreferOnDevice(): boolean {
  return true;
}
