/**
 * On-device Gemma — Lang's ONLY AI model.
 *
 * RULES:
 *   1. Gemma is the SOLE source of AI generation. No OpenAI, Claude, GPT,
 *      Groq, or any other cloud/local LLM is permitted.
 *   2. Uses Google's LiteRT-LM for on-device GPU inference (Metal on iOS,
 *      GPU delegate on Android). Model is Gemma 4 E2B.
 *   3. Model weights are downloaded once from HuggingFace (~2.5 GB) and
 *      cached locally. After download, everything runs 100% offline.
 *   4. If the real model isn't available, the local stub provides
 *      deterministic offline responses. The rest of the app keeps working.
 *   5. Every call logs: MODEL USED, input, and output.
 *
 * Public API:
 *   - loadGemmaModel(): Promise<boolean>
 *   - downloadAndLoadModel(): Promise<boolean>
 *   - unloadGemmaModel(): Promise<void>
 *   - chatWithGemma(messages, opts?): Promise<string>
 *   - generateTutorJson(messages, opts?): Promise<object>
 *   - subscribeGemmaState(fn): () => void
 *   - getGemmaState(): GemmaEngineState
 *   - isGemmaSupported(): boolean
 */

// Dynamic import — native module may not exist (Expo Go, missing pods, etc.)
// If it fails, the engine falls back to the deterministic stub automatically.
let initLlama: ((opts: any) => Promise<any>) | null = null;
try {
  const mod = require("llama.rn");
  initLlama = mod.initLlama;
  console.log("[gemma-engine] llama.rn native module detected");
} catch (e) {
  console.warn("[gemma-engine] llama.rn not available -- will use stub fallback");
}
import * as FileSystem from "expo-file-system";
import { stubChat, stubGenerateTutorJson, getCuratedPhonetic, stripQuestionWrapper, labelToCode, pinyinToSayLike, getMandariTipForPinyin, composeLocalTranslation, lookupChinesePinyin } from "./gemma-stub";

// ── Model tiers ───────────────────────────────────────────────────────────────
// Official ggml-org models (llama.cpp project) -- guaranteed llama.rn compatible.
// Primary : Gemma 3 1B IT Q4_K_M -- 806 MB, fast download, all devices
// Fallback: same as primary (single reliable model)
// High-end: Gemma 3 4B IT Q4_K_M -- ~2.5 GB, better tutoring quality
const MODEL_DIR = (FileSystem.documentDirectory ?? "") + "models/";

const MODELS = {
  primary: {
    file: "gemma-3-1b-it-Q4_K_M.gguf",
    url: "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf",
    label: "Gemma 3 1B",
    minRamMb: 0,
  },
  fallback: {
    file: "gemma-3-1b-it-Q4_K_M.gguf",
    url: "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf",
    label: "Gemma 3 1B",
    minRamMb: 0,
  },
  highEnd: {
    file: "gemma-3-4b-it-Q4_K_M.gguf",
    url: "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf",
    label: "Gemma 3 4B",
    minRamMb: 4000,
  },
} as const;

type ModelTier = keyof typeof MODELS;

// ── Stop words & output sanitizer ─────────────────────────────────────────────
// Note: ["<", "/s>"].join("") builds the stop token at runtime to avoid
// XML-parser corruption when this source is embedded in tool parameters.
const STOP_WORDS = [
  "<end_of_turn>",
  "<eos>",
  "<|end|>",
  "<|eot_id|>",
  "<|end_of_text|>",
  "<|im_end|>",
  "<|EOT|>",
  ["<", "/s>"].join(""),
];

function sanitizeOutput(text: string): string {
  return text
    .replace(/<end_of_turn>/g, "")
    .replace(/<\/s>/g, "")
    .replace(/<eos>/g, "")
    .replace(/<\|end\|>/g, "")
    .replace(/<\|eot_id\|>/g, "")
    .replace(/<\|im_end\|>/g, "")
    .trim();
}

// ── Runtime state ─────────────────────────────────────────────────────────────
const MAX_PROMPT_CHARS = 1200;
const MAX_CONSECUTIVE_FAILURES = 5;
const FAILURE_RESET_MS = 30_000;
let consecutiveFailures = 0;
let lastFailureAt = 0;
let llamaContext: any = null;
let selectedModelTier: ModelTier = "fallback";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type GemmaAvailability =
  | "ready"              // real model loaded and serving
  | "downloading"        // model is being downloaded
  | "stub"               // dev stub serving (no real weights)
  | "needs-download"     // model not bundled; download available
  | "needs-native-build" // the native module isn't linked
  | "download-failed"    // download was attempted and failed
  | "unknown";

export interface GemmaEngineState {
  loaded: boolean;
  loading: boolean;
  downloadProgress: number;
  availability: GemmaAvailability;
  accelerator: "metal" | "coreml" | "vulkan" | "xnnpack" | "cpu" | "stub" | null;
  error: string | null;
  /** True when using the local stub instead of real model weights. */
  usingStub: boolean;
  /** Detailed diagnostic message for debugging. */
  diagnostic: string;
}

const HAS_NATIVE = initLlama !== null;

// ── State ──────────────────────────────────────────────────────────────────
// KEY DESIGN: The stub activates IMMEDIATELY when no native module exists.
// This means AI features work from the first millisecond — even in Expo Go
// or on web. If the real model is later downloaded, the engine upgrades.

let engineState: GemmaEngineState = {
  loaded: true,
  loading: false,
  downloadProgress: 0,
  availability: "stub",
  accelerator: "stub",
  error: null,
  usingStub: true,
  diagnostic: HAS_NATIVE
    ? "On-device AI ready. Download model for full quality."
    : "Expo Go / web detected. Stub active. Use a dev build (expo run:ios) for GPU inference.",
};

console.log("[gemma] INIT: Stub activated — AI features available now");

const listeners = new Set<(s: GemmaEngineState) => void>();

function setState(patch: Partial<GemmaEngineState>) {
  engineState = { ...engineState, ...patch };
  listeners.forEach((fn) => fn({ ...engineState }));
}

export function subscribeGemmaState(fn: (s: GemmaEngineState) => void) {
  listeners.add(fn);
  fn({ ...engineState });
  return () => {
    listeners.delete(fn);
  };
}

export function getGemmaState(): GemmaEngineState {
  return { ...engineState };
}

export function isGemmaSupported(): boolean {
  return HAS_NATIVE;
}

// ── Load / unload ──────────────────────────────────────────────────────────

/**
 * Implicit load — called by tutor pipeline when model not loaded.
 * Does NOT download. Just activates stub or confirms real model.
 */
export async function loadGemmaModel(): Promise<boolean> {
  console.log("[gemma] INITIALIZING GEMMA...");
  console.log(`[gemma] STATE: loaded=${engineState.loaded}, availability=${engineState.availability}, usingStub=${engineState.usingStub}`);

  if (engineState.loaded && engineState.availability === "ready") {
    console.log("[gemma] MODEL ALREADY LOADED (real). Skipping.");
    return true;
  }

  if (engineState.loading) {
    console.log("[gemma] Load already in progress -- waiting...");
    const deadline = Date.now() + 30_000;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!engineState.loading || Date.now() > deadline) { resolve(); return; }
        setTimeout(check, 200);
      };
      check();
    });
    console.log(`[gemma] Waited for in-progress load. Result: loaded=${engineState.loaded}, usingStub=${engineState.usingStub}`);
    return engineState.loaded;
  }

  if (!initLlama) {
    activateStub("Native module not linked. Use a dev build (expo run:ios) for GPU inference.");
    return true;
  }

  // Try to auto-load a cached model file from disk (survives app rebuilds)
  const tier = selectModelTier();
  const model = MODELS[tier];
  const modelPath = MODEL_DIR + model.file;
  try {
    const info = await FileSystem.getInfoAsync(modelPath);
    if (info.exists) {
      console.log(`[gemma] MODEL FILE FOUND: ${modelPath}`);
      setState({ loaded: false, loading: true });
      const ok = await tryLoadModel(tier, modelPath, 1);
      if (ok) {
        console.log("[gemma] Auto-loaded cached model successfully");
        return true;
      }
    }
  } catch { /* ignore */ }

  // Model not on disk -- activate stub and kick off background download
  console.log("[gemma] Model not downloaded -- activating stub + starting background download...");
  activateStub("Downloading AI model in background...");
  downloadAndLoadModel().catch((e) => console.warn("[gemma] Background download error:", e));
  return true;
}

export async function downloadAndLoadModel(): Promise<boolean> {
  console.log("[gemma] USER-TRIGGERED DOWNLOAD...");

  if (engineState.loading) {
    console.log("[gemma] Load already in progress. Skipping.");
    return false;
  }

  if (!initLlama) {
    setState({
      error: "Cannot download model: native inference module not linked. Rebuild the app.",
      availability: "needs-native-build",
      diagnostic: "llama.rn not linked. Cannot download or run models.",
    });
    return false;
  }

  if (engineState.loaded && engineState.availability === "ready") {
    console.log("[gemma] Real model already loaded. No download needed.");
    return true;
  }

  const tier = selectModelTier();
  const model = MODELS[tier];
  const modelPath = MODEL_DIR + model.file;

  setState({
    loading: true,
    error: null,
    downloadProgress: 0,
    availability: "downloading",
    diagnostic: `Downloading ${model.label} from HuggingFace...`,
  });

  try { await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true }); } catch { /* exists */ }

  const info = await FileSystem.getInfoAsync(modelPath);
  if (!info.exists) {
    console.log(`[gemma] DOWNLOADING ${model.label} to ${modelPath}`);
    const dl = FileSystem.createDownloadResumable(
      model.url,
      modelPath,
      {},
      (progress) => {
        const pct = progress.totalBytesExpectedToWrite > 0
          ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
          : 0;
        console.log(`[gemma] DOWNLOAD PROGRESS: ${Math.round(pct * 100)}%`);
        setState({ downloadProgress: pct, diagnostic: `Downloading ${model.label}: ${Math.round(pct * 100)}%` });
      },
    );
    try {
      await dl.downloadAsync();
      console.log(`[gemma] DOWNLOAD COMPLETE: ${model.label}`);
    } catch (e: any) {
      console.warn(`[gemma] DOWNLOAD FAILED: ${e?.message}`);
      activateStub("Download failed. Tap to retry.");
      setState({ availability: "download-failed" });
      return false;
    }
  }

  const ok1 = await tryLoadModel(tier, modelPath, 1);
  if (ok1) return true;

  console.warn("[gemma] RETRYING model load (attempt 2 of 2)...");
  setState({ downloadProgress: 0, diagnostic: "Retrying model load..." });
  const ok2 = await tryLoadModel(tier, modelPath, 2);
  if (ok2) return true;

  activateStub("Model load failed. Tap to retry.");
  setState({ availability: "download-failed" });
  return false;
}

function selectModelTier(): ModelTier {
  if (llamaContext !== null) return selectedModelTier;
  return "primary";
}

async function tryLoadModel(tier: ModelTier, modelPath: string, attempt: number): Promise<boolean> {
  if (!initLlama) return false;
  try {
    console.log(`[gemma] LOADING MODEL ${MODELS[tier].label} (attempt ${attempt})...`);
    llamaContext = await initLlama({
      model: modelPath,
      n_gpu_layers: 99,
      n_ctx: 2048,
      n_batch: 512,
    });
    selectedModelTier = tier;
    console.log(`[gemma] MODEL LOADED SUCCESSFULLY (${MODELS[tier].label})`);
    setState({
      loaded: true,
      loading: false,
      downloadProgress: 1,
      accelerator: "metal",
      availability: "ready",
      error: null,
      usingStub: false,
      diagnostic: `${MODELS[tier].label} loaded -- GPU inference active.`,
    });
    return true;
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    console.warn(`[gemma] MODEL LOAD FAILED (attempt ${attempt}): ${msg}`);
    llamaContext = null;
    setState({
      error: msg,
      loading: attempt >= 2 ? false : true,
      diagnostic: `Load attempt ${attempt} failed: ${msg}`,
    });
    return false;
  }
}

function activateStub(diagnostic: string): void {
  setState({
    loaded: true,
    loading: false,
    downloadProgress: 0,
    availability: "stub",
    accelerator: "stub",
    error: null,
    usingStub: true,
    diagnostic,
  });
}

export async function unloadGemmaModel(): Promise<void> {
  if (!llamaContext || engineState.availability !== "ready") return;
  try {
    await llamaContext.release();
    llamaContext = null;
    console.log("[gemma] Model unloaded.");
  } catch { /* ignore */ }
  setState({
    loaded: false,
    downloadProgress: 0,
    accelerator: null,
    usingStub: false,
    diagnostic: "Model unloaded.",
  });
}

// ── Chat ───────────────────────────────────────────────────────────────────
// Single entry point for all text generation. Never throws -- always returns
// a valid string (real model output or stub fallback).
export async function chatWithGemma(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const userContent = messages.find((m) => m.role === "user")?.content || "";
  console.log("[gemma-engine] MODEL USED:", engineState.usingStub ? "STUB" : selectedModelTier.toUpperCase());
  console.log("[gemma-engine] GEMMA INPUT:", userContent.slice(0, 200));

  if (!engineState.loaded) {
    await loadGemmaModel();
  }

  if (engineState.usingStub) {
    const output = stubChat(messages);
    console.log("[gemma-engine] STUB OUTPUT:", output.slice(0, 200));
    return output;
  }

  if (!llamaContext) {
    console.warn("[gemma-engine] llamaContext missing after load -- falling back to stub");
    activateStub("Context missing unexpectedly.");
    return stubChat(messages);
  }

  const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
  let cappedMessages = messages;
  if (totalChars > MAX_PROMPT_CHARS) {
    cappedMessages = messages.map((m) => ({
      ...m,
      content: m.content.slice(0, Math.floor(MAX_PROMPT_CHARS / messages.length)),
    }));
  }

  const startMs = Date.now();
  console.log(`[gemma-engine] GEMMA START (llama.rn / ${selectedModelTier})`);

  try {
    let raw = "";
    await llamaContext.completion(
      {
        messages: cappedMessages,
        n_predict: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.7,
        stop: STOP_WORDS,
      },
      (token: { token: string }) => { raw += token.token; },
    );
    const elapsed = Date.now() - startMs;
    const result = sanitizeOutput(raw);
    console.log(`[gemma-engine] GEMMA SUCCESS ms=${elapsed}`);
    console.log("[gemma-engine] GEMMA OUTPUT:", result.slice(0, 200));
    if (!result) {
      console.warn("[gemma-engine] empty output -- falling back to stub");
      return stubChat(messages);
    }
    consecutiveFailures = 0;
    return result;
  } catch (e: any) {
    console.warn("[gemma-engine] GEMMA FAILED:", e?.message);
    consecutiveFailures++;
    lastFailureAt = Date.now();
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const elapsed = Date.now() - lastFailureAt;
      if (elapsed < FAILURE_RESET_MS) {
        console.warn("[gemma-engine] Too many failures -- activating stub");
        activateStub("Too many inference failures. Using stub fallback.");
      }
    }
    return stubChat(messages);
  }
}

// ── Chunk validation / regeneration ──────────────────────────────────────────
// Ensures phrase-mode chunks actually correspond to the real translation.
// If the Gemma breakdown or stub produced chunks that don't match, we
// regenerate deterministic chunks by splitting the translation directly.

function validateAndFixChunks(
  chunks: { english: string; target: string; phonetic: string; tip: string }[],
  translation: string,
  targetCode: string,
  englishPhrase: string,
): { english: string; target: string; phonetic: string; tip: string }[] {
  if (!translation) return chunks.length > 0 ? chunks : [{ target: "", english: englishPhrase, phonetic: "", tip: "" }];

  // Check how many chunk targets actually appear in the translation
  const matchCount = chunks.filter(c =>
    c.target && translation.includes(c.target)
  ).length;
  const matchRatio = chunks.length > 0 ? matchCount / chunks.length : 0;

  if (chunks.length > 0 && matchRatio > 0.5) {
    console.log(`[gemma-engine] chunks validated: ${matchCount}/${chunks.length} match translation`);
    return chunks;
  }

  console.warn(`[gemma-engine] chunks don't match translation (${matchCount}/${chunks.length}) — regenerating from translation`);

  // Regenerate deterministically from the actual translation
  const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(translation);
  const newChunks: { english: string; target: string; phonetic: string; tip: string }[] = [];

  if (isCJK) {
    // Split CJK by individual characters or 2-char groups
    const chars = [...translation].filter(c => /[\u4e00-\u9fff]/.test(c));
    // Group into chunks of 1-2 characters for bite-sized practice
    const groupSize = chars.length <= 3 ? 1 : 2;
    for (let i = 0; i < chars.length; i += groupSize) {
      const group = chars.slice(i, i + groupSize).join("");
      newChunks.push({ target: group, english: "", phonetic: "", tip: "" });
    }
  } else {
    // Latin: split by words, group into 2-3 word chunks
    const words = translation.split(/\s+/).filter(Boolean);
    const groupSize = words.length <= 4 ? Math.max(1, Math.ceil(words.length / 2)) : 3;
    for (let i = 0; i < words.length; i += groupSize) {
      const group = words.slice(i, i + groupSize).join(" ");
      newChunks.push({ target: group, english: "", phonetic: "", tip: "" });
    }
  }

  // Ensure we have at least 1 chunk and at most 6
  if (newChunks.length === 0) {
    newChunks.push({ target: translation, english: englishPhrase, phonetic: "", tip: "" });
  } else if (newChunks.length > 6) {
    // Merge trailing chunks
    const last = newChunks.splice(5).map(c => c.target).join(isCJK ? "" : " ");
    newChunks[newChunks.length - 1].target += (isCJK ? "" : " ") + last;
  }

  // Set english for first chunk to the original phrase as context
  if (newChunks.length > 0) {
    newChunks[0].english = newChunks[0].english || englishPhrase;
  }

  // Populate pinyin for Mandarin chunks so the user always sees how to read them
  if (targetCode === "zh") {
    for (const chunk of newChunks) {
      if (!chunk.phonetic && chunk.target) {
        chunk.phonetic = lookupChinesePinyin(chunk.target);
      }
    }
  }

  console.log(`[gemma-engine] regenerated ${newChunks.length} chunks from translation: ${newChunks.map(c => c.target).join(" | ")}`);
  return newChunks;
}

// ── Offline stub enrichment (no network, no external APIs) ─────────────────
// When Gemma isn't loaded AND the phrase isn't in the curated stub, the stub
// returns a SAFE_PRACTICE_PHRASE (e.g. "你好吗？"). This function detects that
// and tries the local word-composition engine in gemma-stub.ts instead.
// Everything runs 100% on-device — no network calls, works in China.

const SAFE_PHRASE_SIGNALS = [
  "你好吗", "¿Cómo estás", "Comment allez-vous", "Wie geht es",
  "잘 지내세요", "Come stai", "Como você está", "お元気ですか",
  "كيف حالك", "आप कैसे हैं",
];

async function stubWithOnlineFallback(messages: ChatMessage[]): Promise<Record<string, unknown>> {
  const stubResult = stubGenerateTutorJson(messages);
  const naturalPhrase = String(stubResult.naturalPhrase || "");

  // Fast path: stub returned a real curated entry — use it as-is.
  const isSafeFallback = SAFE_PHRASE_SIGNALS.some((s) => naturalPhrase.includes(s));
  if (!isSafeFallback) return stubResult;

  // Extract the phrase and target language.
  const systemContent = messages.find((m) => m.role === "system")?.content || "";
  const userContent   = messages.find((m) => m.role === "user")?.content   || "";
  const rawPhrase = (
    userContent.match(/User said:\s*(.+)/i)?.[1]?.trim() ||
    userContent.split("\n")[0]?.trim() ||
    userContent.trim()
  );
  const phraseToTranslate = stripQuestionWrapper(rawPhrase) || rawPhrase;
  const targetMatch = (
    systemContent.match(/learning\s+([A-Za-z\s]+?)\./)?.[1] ||
    systemContent.match(/into\s+([A-Za-z\s]+?)\./)?.[1] ||
    "Spanish"
  ).trim();
  const targetCode = labelToCode(targetMatch);

  if (!phraseToTranslate) return stubResult;

  // Long / colloquial phrases (slang, run-ons, >12 words) produce garbage
  // word-for-word output from the composition engine. Show an honest message
  // instead so the user understands they need the AI model.
  const wordCount = phraseToTranslate.trim().split(/\s+/).length;
  const tooLong = wordCount > 12;

  // Helper to build honest "needs AI model" override (or "try again" when real model IS loaded)
  const applyNeedsAiModel = () => {
    const nativeCode2 = labelToCode(
      messages.find((m) => m.role === "system")?.content
        .match(/user speaks\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\.|$)/i)?.[1]?.trim() || "English"
    );
    // Fix 1: Don't show "Download AI model" when Gemma IS loaded — it just had a one-off failure
    const tip = engineState.usingStub
      ? `This phrase is too complex for offline mode. Download the AI model in Settings for full ${targetMatch} translation.`
      : `Couldn't translate this phrase. Please try rephrasing or try again.`;
    stubResult.naturalPhrase  = engineState.usingStub ? phraseToTranslate : "";
    stubResult.audioText      = tip;
    stubResult.literalMeaning = phraseToTranslate;
    stubResult.phonetic       = "";
    stubResult.localReply     = tip;
    stubResult.context        = tip;
    stubResult.audioSegments  = [{ lang: nativeCode2, text: tip }];
    stubResult.chunks         = [{ target: phraseToTranslate, english: phraseToTranslate, phonetic: "", tip }];
  };

  // Fix 3: Only enforce the 12-word gate in pure stub mode (real model not installed).
  // When the real model IS loaded but had a one-off failure, we still try composition.
  if (tooLong && engineState.usingStub) {
    console.log(`[gemma-engine] phrase too long (${wordCount} words) for offline composition — needs AI model`);
    applyNeedsAiModel();
    return stubResult;
  }

  // Try local word-composition (100% offline, no network).
  const composed = composeLocalTranslation(phraseToTranslate, targetCode);
  if (!composed) {
    console.log(`[gemma-engine] offline composition failed for "${phraseToTranslate}" — needs AI model`);
    applyNeedsAiModel();
    return stubResult;
  }

  console.log(`[gemma-engine] offline composition: "${phraseToTranslate}" → "${composed.phrase}" (${targetCode})`);
  // Build proper audio segments so the transcript shows the composed phrase,
  // not the old curated ¿Cómo estás? / 你好吗 entry.
  const nativeCodeFallback = labelToCode(
    messages.find((m) => m.role === "system")?.content
      .match(/user speaks\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\.|$)/i)?.[1]?.trim() || "English"
  );
  const introText = `Here's how to say it in ${targetMatch}:`;
  stubResult.naturalPhrase  = composed.phrase;
  stubResult.audioText      = composed.phrase;
  stubResult.literalMeaning = phraseToTranslate;
  stubResult.phonetic       = composed.phonetic;
  stubResult.localReply     = `In ${targetMatch}, "${phraseToTranslate}" is "${composed.phrase}".`;
  stubResult.context        = `Here's how to say it in ${targetMatch}.`;
  stubResult.audioSegments  = [
    { lang: nativeCodeFallback, text: introText },
    { lang: targetCode,         text: composed.phrase },
  ];
  stubResult.chunks = composed.chunks;

  // Final guard: ensure no stale curated phrase leaks into the target segment.
  const _segs = stubResult.audioSegments as { lang: string; text: string }[];
  const _tgt  = _segs.find((s) => s.lang === targetCode);
  if (_tgt && SAFE_PHRASE_SIGNALS.some((sig) => _tgt.text.includes(sig))) {
    _tgt.text = composed.phrase;
  }

  return stubResult;
}

// ── Structured tutor output ────────────────────────────────────────────────────
// HYBRID APPROACH: The real model only does SIMPLE TRANSLATION (tiny prompt).
// The stub handles phonetics, formatting, and all the structured fields.
// This prevents native OOM crashes that occur with large system prompts.
export async function generateTutorJson(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<Record<string, unknown>> {
  // ── Ensure model is loaded ──────────────────────────────────────────────────
  if (!engineState.loaded) {
    await loadGemmaModel();
  }

  // ── Reset failure counter if enough time has passed ────────────────────────
  if (consecutiveFailures > 0 && Date.now() - lastFailureAt > FAILURE_RESET_MS) {
    console.log(`[gemma-engine] Resetting failure counter (${consecutiveFailures} → 0, ${Math.round((Date.now() - lastFailureAt) / 1000)}s elapsed)`);
    consecutiveFailures = 0;
  }

  // ── Stub path: only when the real model is genuinely not available ───────
  if (engineState.usingStub) {
    console.log("[gemma-engine] generateTutorJson: USING STUB (model not available)");
    return stubWithOnlineFallback(messages);
  }
  // Fix 2: When real model IS loaded, hitting MAX_CONSECUTIVE_FAILURES no longer
  // permanently locks to stub. Reset the counter and let Gemma retry.
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.warn(`[gemma-engine] generateTutorJson: ${consecutiveFailures} failures — resetting counter (real model loaded, retrying Gemma)`);
    consecutiveFailures = 0;
    lastFailureAt = Date.now();
  }

  // ── Extract the user's intent from the messages ────────────────────────────
  const systemContent = messages.find((m) => m.role === "system")?.content || "";
  const userContent = messages.find((m) => m.role === "user")?.content || "";

  // Pull target language from the system prompt
  const targetMatch = systemContent.match(/learning\s+([A-Za-z\s]+?)\./)?.[1]
    || systemContent.match(/into\s+([A-Za-z\s]+?)\./)?.[1]
    || "Spanish";
  const targetLabel = targetMatch.trim();
  const targetCode = labelToCode(targetLabel);

  // Extract the actual phrase the user wants translated.
  // Strip meta-question wrappers: "How do I say hello?" → "hello"
  const rawUserPhrase = userContent.match(/User said:\s*(.+)/i)?.[1]?.trim()
    || userContent.split("\n")[0]?.trim()
    || userContent.trim();
  const phraseMatch = stripQuestionWrapper(rawUserPhrase);

  // Hard cap: never send more than 20 words to the native model.
  // Very long inputs may cause slower inference but most real phrases are < 15 words.
  const MAX_PHRASE_WORDS = 20;
  const phraseWords = phraseMatch.split(/\s+/);
  const cappedPhrase = phraseWords.length > MAX_PHRASE_WORDS
    ? phraseWords.slice(0, MAX_PHRASE_WORDS).join(" ")
    : phraseMatch;
  const isLongPhrase = phraseWords.length > 5;

  // ── Language-specific COMBINED translation + phonetic prompt ──────────────
  // Single call: line 1 = translation, line 2 = pronunciation guide.
  // This replaces two separate sequential Gemma calls (~4-8s saved per turn).
  const contextRule = `IMPORTANT: Choose the word/form that matches the EXACT meaning and context. For example, "I love pizza" should use the word for enjoying food, NOT romantic love. "I love my friend" should use a casual/platonic word, not a romantic one. Always match the speaker's intent.`;
  let sysContent: string;
  // Fix C: add COMPLETE phrase instruction so 1B model never truncates mid-phrase
  const completeRule = `CRITICAL: Translate the COMPLETE phrase. Do NOT stop early or omit any words. Every word in the input MUST appear in the translation.`;
  if (targetCode === "zh") {
    // Multi-word example teaches the 2B model to translate full phrases, not just keywords
    const zhExample = isLongPhrase
      ? `Example for "the pizza looks good":\n披萨看起来很好吃\npīsà kàn qǐlái hěn hǎo chī`
      : `Example for "hello":\n你好\nnǐ hǎo`;
    sysContent = `Translate to Mandarin Chinese. Reply with EXACTLY two lines:\nLine 1: Chinese characters ONLY (no pinyin, no English)\nLine 2: Pinyin with tone marks\n${zhExample}\n${contextRule}\n${completeRule}`;
  } else if (targetCode === "es") {
    sysContent = `Translate to Spanish. Reply with EXACTLY two lines:\nLine 1: The Spanish phrase (ALL words — do NOT stop early)\nLine 2: English-readable pronunciation (capitalize stressed syllables)\nExample for 3 words:\nMe encanta la pizza\nmeh en-KAHN-tah lah PEET-sah\n${contextRule}\n${completeRule}`;
  } else if (targetCode === "fr") {
    sysContent = `Translate to French. Reply with EXACTLY two lines:\nLine 1: The French phrase (ALL words — do NOT stop early)\nLine 2: English-readable pronunciation (capitalize stressed syllables)\nExample for 3 words:\nJ'adore la pizza\nzha-DOR lah peed-ZAH\n${contextRule}\n${completeRule}`;
  } else {
    sysContent = `Translate into ${targetLabel}. Reply with EXACTLY two lines:\nLine 1: The COMPLETE ${targetLabel} translation (ALL words — do NOT stop early)\nLine 2: English-readable pronunciation (capitalize stressed syllables)\n${contextRule}\n${completeRule}`;
  }

  const translatePrompt: ChatMessage[] = [
    { role: "system", content: sysContent },
    { role: "user", content: cappedPhrase.slice(0, 100) },
  ];

  // ── Top-level crash guard: any native OOM/timeout falls back to stub ───────
  try {

  let translation = "";
  let gemmaPinyin = ""; // Populated for Mandarin when model returns pinyin on line 2
  let gemmaPhonetic = ""; // Populated from the combined prompt's line 2
  try {
    const rawOutput = await chatWithGemma(translatePrompt, {
      maxTokens: 100, // headroom for 2-line output
      temperature: 0.1,
    });
    // Clean common model quirks: leading/trailing quotes, "Translation:" prefix,
    // and Gemma chat-template special tokens (<start_of_turn> etc.)
    const cleaned = rawOutput
      .replace(/<\/?(?:start_of_turn|end_of_turn)>/g, "")
      .replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, "")
      .replace(/^(?:translation|answer|result|here)\s*[:=]\s*/i, "")
      .trim();

    // Parse the two-line response: line 1 = translation, line 2 = phonetic
    const allLines = cleaned.split(/\n/).map(l => l.trim()).filter(Boolean);

    if (targetCode === "zh") {
      const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);
      const chineseLine = allLines.find(hasChinese);
      if (chineseLine) {
        translation = chineseLine;
        // Grab pinyin from the remaining lines
        const pinyinLine = allLines.find(l => l !== chineseLine && !hasChinese(l) && /[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(l));
        if (pinyinLine) {
          gemmaPinyin = pinyinLine;
          gemmaPhonetic = pinyinLine;
          console.log(`[gemma-engine] zh pinyin from combined prompt: "${gemmaPinyin}"`);
        }
      } else {
        translation = "";
        console.warn("[gemma-engine] zh translation contained no Chinese characters — rejecting");
      }
    } else {
      // Line 1 = translation, Line 2 = phonetic (if present)
      const line1 = allLines[0] || cleaned;
      translation = line1.replace(/^[-\d.*•]+\s*/, "").trim();
      if (allLines.length >= 2) {
        const line2 = allLines[1].replace(/^[-\d.*•]+\s*/, "").replace(/^pronunciation\s*[:=]\s*/i, "").trim();
        // Fix A: strict phonetic detection — require actual phonetic markers.
        // ALL-CAPS stressed syllables (BWH-nos), hyphens (DEE-as), or pinyin
        // tone marks (nǐ hǎo). The old length-based fallback was too loose and
        // silently filed "la pizza" as the pronunciation guide for "Me encanta".
        const looksLikePhonetic =
          /[A-Z]{2,}/.test(line2) ||
          /(?<![a-zA-Z])-(?![a-zA-Z])|-[A-Z]|[A-Z]-/.test(line2) ||
          /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(line2);
        if (line2 && looksLikePhonetic && line2.toLowerCase() !== translation.toLowerCase()) {
          gemmaPhonetic = line2;
          console.log(`[gemma-engine] phonetic from combined prompt: "${gemmaPhonetic}"`);
        } else if (line2 && !looksLikePhonetic && line2.toLowerCase() !== translation.toLowerCase()) {
          // line2 looks like continuation of the translation (e.g. "la pizza"),
          // not a pronunciation guide — append it.
          translation = `${translation} ${line2}`.trim();
          console.log(`[gemma-engine] appended non-phonetic line2 to translation: "${translation}"`);
        }
      }
    }

    if (translation.length > 150) {
      console.warn(`[gemma-engine] generateTutorJson: translation too long — truncating`);
      translation = translation.slice(0, 150).replace(/\s+\S*$/, "").trim();
    }

    consecutiveFailures = 0;
    console.log(`[gemma-engine] generateTutorJson: model translated "${phraseMatch}" → "${translation}"${gemmaPinyin ? ` [pinyin: ${gemmaPinyin}]` : ""}`);
  } catch (e: any) {
    consecutiveFailures++;
    lastFailureAt = Date.now();
    console.warn(`[gemma-engine] generateTutorJson: translation failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, e?.message);
  }

  // Reject garbage: empty, echo, or instruction echoes
  let isGarbage = !translation
    || translation.toLowerCase() === phraseMatch.toLowerCase()
    || /line\s*\d|chinese characters|pinyin|translat|example|no\s+translation|not\s+(?:needed|required|necessary)|cannot\s+translate|I\s+(?:can't|cannot|don't)/i.test(translation);

  // For Mandarin/Japanese/Korean: translation must be ≥40% CJK characters
  // and must not start with a digit (catches "0宅"-style stub garbage)
  if (!isGarbage && (targetCode === "zh" || targetCode === "ja" || targetCode === "ko")) {
    const cjkChars = (translation.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
    const cjkRatio = translation.length > 0 ? cjkChars / translation.length : 0;
    if (/^\d/.test(translation) || cjkRatio < 0.35) {
      console.warn(`[gemma-engine] zh/ja/ko garbage detected (cjkRatio=${cjkRatio.toFixed(2)}, starts with digit=${/^\d/.test(translation)}): "${translation}"`);
      isGarbage = true;
    }
    // Truncation detection: if input has 3+ words but output is ≤2 CJK chars,
    // the model likely dropped most of the phrase (e.g. "the pizza looks good" → "看好")
    if (!isGarbage && phraseWords.length >= 3 && cjkChars <= 2) {
      console.warn(`[gemma-engine] zh truncation detected: ${phraseWords.length} input words → only ${cjkChars} CJK chars ("${translation}") — retrying`);
      isGarbage = true;
    }
  }

  // For non-CJK: catch suspiciously short translations for multi-word inputs.
  // Rules (applied in order — first match wins):
  //   • 3+ input words → translation must have ≥ 2 words (catches "I love people" → "Yo")
  //   • 4+ input words → translation must have ≥ 2 words (catches any single-word echo)
  //   • 5+ input words → translation must have ≥ floor(input * 0.5) words (proportional)
  if (!isGarbage && targetCode !== "zh" && targetCode !== "ja" && targetCode !== "ko") {
    const translationWords = translation.trim().split(/\s+/).length;
    const minExpected =
      phraseWords.length >= 5 ? Math.floor(phraseWords.length * 0.5) :
      phraseWords.length >= 3 ? 2 : 1;
    if (translationWords < minExpected) {
      console.warn(`[gemma-engine] truncation detected: ${phraseWords.length} input words → only ${translationWords} output words (min expected ${minExpected}): "${translation}" — retrying`);
      isGarbage = true;
    }
  }

  // Fix 4: When real model IS loaded, retry once with a simpler prompt before falling to stub
  if (isGarbage && !engineState.usingStub) {
    console.warn("[gemma-engine] garbage detected — retrying with explicit prompt");
    try {
      // More explicit retry prompt: include word count and example to prevent truncation
      const wordCount = phraseMatch.trim().split(/\s+/).length;
      const retrySystem = targetCode === "zh"
        ? `You are a Chinese translator. Translate the ENTIRE ${wordCount}-word English phrase to Mandarin Chinese. Include ALL nouns, verbs, and adjectives. Reply with ONLY the Chinese characters, nothing else. Example: "the pizza looks good" → "披萨看起来很好吃"`
        : `Translate the ENTIRE ${wordCount}-word phrase to ${targetLabel}. Include every word. Reply with ONLY the translated phrase, nothing else.`;
      const retryOut = await chatWithGemma([
        { role: "system", content: retrySystem },
        { role: "user", content: phraseMatch.slice(0, 60) },
      ], { maxTokens: 80, temperature: 0.05 });
      const retried = retryOut.trim()
        .replace(/<\/?(?:start_of_turn|end_of_turn)>/g, "")
        .replace(/^["""'']+|["""'']+$/g, "")
        .trim();
      let retryGarbage = !retried
        || retried.toLowerCase() === phraseMatch.toLowerCase()
        || /line\s*\d|chinese characters|translat|example/i.test(retried);
      // Also check retry for truncation (zh: must have >2 CJK chars for 3+ word input)
      if (!retryGarbage && targetCode === "zh" && wordCount >= 3) {
        const retryCjk = (retried.match(/[一-鿿]/g) || []).length;
        if (retryCjk <= 2) {
          console.warn(`[gemma-engine] retry also truncated: ${retryCjk} CJK chars for ${wordCount}-word input`);
          retryGarbage = true;
        }
      }
      if (!retryGarbage) {
        translation = retried;
        isGarbage = false;
        consecutiveFailures = 0;
        console.log(`[gemma-engine] retry succeeded: "${retried}"`);
      }
    } catch (retryErr: any) {
      console.warn("[gemma-engine] retry also failed:", retryErr?.message);
    }
  }

  // When Gemma IS loaded, NEVER fall back to stub — try one last time with the
  // simplest possible prompt, and if that still fails, use whatever we have.
  if (isGarbage && !engineState.usingStub) {
    console.warn("[gemma-engine] all retries exhausted — final attempt with bare prompt");
    try {
      const bareOut = await chatWithGemma([
        { role: "user", content: `${phraseMatch} = ${targetLabel}:` },
      ], { maxTokens: 60, temperature: 0.0 });
      const bareResult = bareOut.trim()
        .replace(/<\/?(?:start_of_turn|end_of_turn)>/g, "")
        .replace(/^["""'']+|["""'']+$/g, "")
        .split("\n")[0]?.trim();
      if (bareResult && bareResult.toLowerCase() !== phraseMatch.toLowerCase()) {
        translation = bareResult;
        isGarbage = false;
        console.log(`[gemma-engine] bare prompt succeeded: "${bareResult}"`);
      }
    } catch (bareErr: any) {
      console.warn("[gemma-engine] bare prompt failed:", bareErr?.message);
    }
  }

  if (isGarbage && engineState.usingStub) {
    // Only fall to stub when the real model is genuinely not installed
    console.warn("[gemma-engine] generateTutorJson: stub mode — using offline composition");
    return stubWithOnlineFallback(messages);
  }

  // ── NO-FAILURE FALLBACK: try local composition before giving up ────────
  // The user demands translation ALWAYS succeeds. If Gemma failed all
  // attempts, we try the offline word-composition engine and curated
  // dictionary before returning any error.
  if (isGarbage) {
    console.warn("[gemma-engine] Gemma failed — trying composeLocalTranslation as fallback");
    const composed = composeLocalTranslation(cappedPhrase, targetCode);
    if (composed && composed.phrase) {
      console.log(`[gemma-engine] composition fallback succeeded: "${cappedPhrase}" → "${composed.phrase}"`);
      translation = composed.phrase;
      isGarbage = false;
      if (composed.phonetic) {
        gemmaPhonetic = composed.phonetic;
        gemmaPinyin = composed.phonetic;
      }
    }
  }

  if (isGarbage) {
    // Also try stubGenerateTutorJson — it has curated matches + verb patterns
    console.warn("[gemma-engine] composition failed — trying stub curated/pattern match");
    const testStub = stubGenerateTutorJson(messages);
    const stubPhrase = String(testStub.naturalPhrase || "");
    // Accept if it's a real target-language translation, not English echo
    const isEcho = stubPhrase.toLowerCase() === cappedPhrase.toLowerCase();
    const isPlaceholder = stubPhrase === "(translation unavailable)" || !stubPhrase;
    if (!isEcho && !isPlaceholder) {
      console.log(`[gemma-engine] stub fallback accepted: "${stubPhrase}"`);
      // Return the stub result directly — it has proper formatting
      return testStub;
    }
  }

  if (isGarbage) {
    // Absolute last resort — return stub result but never show an error.
    // Per NO-FAILURE rule: always produce SOME translation.
    console.warn("[gemma-engine] generateTutorJson: all paths exhausted — using stub as-is");
    const stubResult = stubGenerateTutorJson(messages);
    const stubPhrase = String(stubResult.naturalPhrase || "");
    // If even the stub returned English/placeholder, clear bad data
    if (!stubPhrase || stubPhrase === "(translation unavailable)" || stubPhrase.toLowerCase() === cappedPhrase.toLowerCase()) {
      stubResult.naturalPhrase = "";
      stubResult.chunks = [];
      const nativeCodeErr = labelToCode(
        systemContent.match(/user speaks\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\.|$)/i)?.[1]?.trim() || "English"
      );
      stubResult.audioSegments = [{ lang: nativeCodeErr, text: `Here's how to say it in ${targetLabel}. Please try again.` }];
      stubResult.context = `Translation is being prepared. Please try again in a moment.`;
    }
    return stubResult;
  }

  // ── Merge real translation with stub formatting ────────────────────────────
  const stubResult = stubGenerateTutorJson(messages);
  stubResult.naturalPhrase = translation;
  stubResult.audioText = translation;
  // Ensure literalMeaning always reflects the user's English intent so the
  // Key Concept card never shows a mismatched "meaning" from a stale stub.
  stubResult.literalMeaning = cappedPhrase;

  // ── audioText sync check: for zh, ensure audioText === naturalPhrase ─────
  // This is a data-layer fix — TTS must speak exactly what the UI shows.
  if (targetCode === "zh" && stubResult.audioText !== stubResult.naturalPhrase) {
    console.warn(`[gemma-engine] audioText mismatch for zh — forcing sync`);
    stubResult.audioText = stubResult.naturalPhrase;
  }

  // Fix: also update audioSegments so TTS plays the Gemma translation,
  // not the stub's fallback phrase ("你好吗" / "¿Cómo estás?").
  const nativeCodeForAudio = systemContent.match(/user speaks\s+([A-Z][a-zA-Z]+)/i)?.[1] || "English";
  const nativeCodeResolved = labelToCode(nativeCodeForAudio.trim());
  stubResult.audioSegments = [
    { lang: nativeCodeResolved, text: `Here's how to say it in ${targetLabel}:` },
    { lang: targetCode,         text: translation },
  ];

  // ── Phonetic: already extracted from combined prompt above ────────────────
  // Fall back to curated lookup if the combined prompt didn't produce one.
  // For Mandarin: ALWAYS provide pinyin — use character-level reverse lookup as last resort.
  let finalPhonetic = gemmaPhonetic || gemmaPinyin || "";
  if (!finalPhonetic) {
    finalPhonetic = getCuratedPhonetic(rawUserPhrase, targetCode) || "";
  }
  if (!finalPhonetic && targetCode === "zh" && translation) {
    finalPhonetic = lookupChinesePinyin(translation);
  }
  stubResult.phonetic = finalPhonetic;

  // ── Word-by-word breakdown via Gemma (BACKGROUND — non-blocking) ────────
  // Runs AFTER the result is returned so TTS can start immediately.
  // The breakdown enriches the response asynchronously; callers see chunks
  // only if they re-read the result object after the promise resolves.
  const chunks: { english: string; target: string; phonetic: string; tip: string }[] = [];
  if (isLongPhrase) {
    console.log(`[gemma-engine] skipping breakdown (phrase > 5 words) to prevent OOM`);
  }

  // ── Validate chunks actually match the translation ─────────────────────
  // Fix B: seed with curated stub chunks if available — they may already be
  // perfect (e.g. [Me, encanta, la, pizza] for "I love pizza"). Only
  // regenerate when they don't match the real translation.
  type ChunkItem = { english: string; target: string; phonetic: string; tip: string };
  const curatedChunks: ChunkItem[] = Array.isArray(stubResult.chunks)
    ? (stubResult.chunks as unknown[]).map((c: any) => ({
        english: String(c?.english || ""),
        target:  String(c?.target  || ""),
        phonetic: String(c?.phonetic || ""),
        tip:     String(c?.tip     || ""),
      }))
    : [];
  const seedChunks = curatedChunks.length > 0 ? curatedChunks : chunks;
  const validatedChunks = validateAndFixChunks(seedChunks, translation, targetCode, cappedPhrase);
  stubResult.chunks = validatedChunks;

  // ── Fire-and-forget background breakdown enrichment ──────────────────────
  // This runs AFTER the main result is returned so TTS starts immediately.
  if (!isLongPhrase && translation) {
    (async () => {
      try {
        const breakdownSys = targetCode === "zh"
          ? `Break a Mandarin phrase into individual words/characters. For each, write one line: word = English meaning. Reply ONLY with the breakdown, one per line.\nExample for "你好吗":\n你 = you\n好 = good\n吗 = (question particle)`
          : targetCode === "es"
          ? `Break a Spanish phrase into individual words. For each, write one line: word = English meaning. Reply ONLY with the breakdown, one per line.\nExample for "Buenos días":\nBuenos = good\ndías = days`
          : targetCode === "fr"
          ? `Break a French phrase into individual words. For each, write one line: word = English meaning. Reply ONLY with the breakdown, one per line.\nExample for "Je m'appelle":\nJe = I\nm'appelle = am called`
          : `Break this ${targetLabel} phrase into words. For each, write: word = English meaning. One per line.`;
        const breakdownOut = await chatWithGemma(
          [{ role: "system", content: breakdownSys }, { role: "user", content: translation.slice(0, 100) }],
          { maxTokens: 120, temperature: 0.1 },
        );
        const lines = breakdownOut.split("\n").map(l => l.trim()).filter(Boolean);
        const hasCJK = (s: string) => /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(s);
        const isLatin = (s: string) => /^[a-zA-ZÀ-ÿ\s''\-().,:;!?]+$/.test(s);
        const bgChunks: typeof chunks = [];
        for (const line of lines) {
          const eqMatch = line.match(/^(.+?)\s*[=→:]\s*(.+)$/);
          if (eqMatch) {
            let left = eqMatch[1].replace(/^[-\d.*•]+\s*/, "").trim();
            let right = eqMatch[2].trim();
            if (left && right && left.length < 40 && right.length < 60) {
              if ((targetCode === "zh" || targetCode === "ja") && isLatin(left) && hasCJK(right)) {
                [left, right] = [right, left];
              }
              const chunkPin = targetCode === "zh" ? lookupChinesePinyin(left) : "";
              bgChunks.push({ target: left, english: right, phonetic: chunkPin, tip: "" });
            }
          }
        }
        if (bgChunks.length > 0) {
          // Mandarin: assign pinyin tips from curated data (no extra Gemma call)
          if (targetCode === "zh") {
            for (const chunk of bgChunks) {
              if (!chunk.tip) chunk.tip = getMandariTipForPinyin(chunk.target);
            }
          }
          const validated = validateAndFixChunks(bgChunks, translation, targetCode, cappedPhrase);
          // Mutate the result in-place so any retained references see the update
          stubResult.chunks = validated;
          console.log(`[gemma-engine] background breakdown: ${validated.length} chunks`);
        }
      } catch (e: any) {
        console.warn("[gemma-engine] background breakdown failed:", e?.message);
      }
    })();
  }

  // audioSegments were already set correctly at lines 736-739 — no override needed.
  if (!stubResult.context
    || (stubResult.context as string).includes("couldn't translate")
    || (stubResult.context as string).includes("Local stub")
    || (stubResult.context as string).includes("stub response")
  ) {
    stubResult.context = `Here's how to say it in ${targetLabel}.`;
  }
  console.log("[gemma-engine] generateTutorJson: hybrid result — real translation + stub formatting");
  return stubResult;

  } catch (outerErr: any) {
    // Top-level guard: native OOM, timeout, or unexpected crash → stub
    console.warn("[gemma-engine] generateTutorJson: OUTER CRASH — falling back to stub:", outerErr?.message);
    consecutiveFailures++;
    lastFailureAt = Date.now();
    return stubGenerateTutorJson(messages);
  }
}

