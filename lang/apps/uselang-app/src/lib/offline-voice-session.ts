// Shared voice controller for Quick Mode and Live Lang.
// Owns recognition, local Gemma generation, TTS, turn cancellation, and the
// state machine that the UI renders.

import { Audio } from "expo-av";
import {
  startNativeSpeechSession,
  speechLocaleFor,
  getNativeSpeechReadinessStatus,
  type NativeSpeechSession,
  type NativeSpeechReadinessStatus,
} from "./native-speech";
import {
  speakOfflineText,
  stopOfflineTts,
  getOfflineTtsStatus,
  ttsLocaleFor,
  type NativeTtsStatus,
} from "./offline-tts";
import { speakRoutedText, stopRoutedTts } from "./tts-router";
import { getGemmaState, chatWithGemma, isGemmaSupported } from "./gemma-engine";
import { composeLocalTranslation, translateLine } from "./gemma-stub";
import { postTutorSessionGemma } from "./gemma-tutor";
import { type TutorRequest, type TutorResponse } from "./tutor-api";
import { runWithTimeout } from "./safe-async";

const GEMMA_TURN_TIMEOUT_MS = 12_000;

export type OfflineVoiceState =
  | "idle"
  | "checking"
  | "ready"
  | "listening"
  | "recognizing"
  | "processing"
  | "speaking"
  | "error"
  | "stopped";

export interface OfflineReadiness {
  ready: boolean;
  blockingMessage?: string;
  blockingAction?: "load-model" | "install-language" | "permission" | "rebuild" | "tts-voice";
  speech: NativeSpeechReadinessStatus;
  tts: NativeTtsStatus;
  nativeTts: NativeTtsStatus;
  gemma: { loaded: boolean; loading: boolean; error: string | null };
}

export interface OfflineVoiceSnapshot {
  state: OfflineVoiceState;
  partialTranscript: string;
  lastUserText: string;
  lastResponse: TutorResponse | null;
  lastTranslation: string;
  errorMessage: string;
  micLevel: number;
}

export type OfflineMode = "tutor" | "translate";

export interface OfflineLine {
  source: string;
  translation: string;
}

export interface OfflineVoiceSessionOpts {
  targetLang: string;
  nativeLang: string;
  mode: OfflineMode;
  onLine?: (line: OfflineLine) => void;
  skipTts?: boolean;
  continuous?: boolean;
  /**
   * Legacy flag retained for callers. All AI uses on-device Gemma only.
   * No cloud LLM or backend AI is ever called from this controller.
   */
  offlineOnly?: boolean;
}

export interface OfflineVoiceController {
  getState(): OfflineVoiceSnapshot;
  subscribe(fn: (s: OfflineVoiceSnapshot) => void): () => void;
  checkReadiness(): Promise<OfflineReadiness>;
  start(): Promise<void>;
  stop(): Promise<void>;
  /**
   * Submit a typed phrase as if the user had spoken it. Skips STT, runs the
   * same Gemma processing, and speaks the result (unless skipTts).
   * Used by Quick Mode's text-input alternative.
   */
  submitText(text: string): Promise<void>;
}

type Provider = "gemma" | "apple-stt" | "apple-tts";

const QUICK_BUDGETS = { llmMs: 650, ttsStartMs: 450, listenMs: 15_000 };
const LIVE_BUDGETS = { llmMs: 800, ttsStartMs: 500, listenMs: 18_000 };
const SPEECH_DELTA_MIN = 0.08;
const SPEECH_DELTA_MAX = 0.24;
const SILENCE_MS_QUICK = 1_400;  // 1.4s silence → finalize (snappier for Quick mode)
const SILENCE_MS_LIVE  = 2_200;  // 2.2s silence → finalize (more forgiving for Live Lang)
const NO_SPEECH_MS = 10_000; // 10s of no speech at all → give up
const NOISE_RESET_MS = 6_000;

function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log("[offline-voice]", ...args);
}

const LANG_HUMAN: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  "zh-CN": "Mandarin",
  ar: "Arabic",
  hi: "Hindi",
  ru: "Russian",
};

function humanLang(code: string): string {
  return LANG_HUMAN[code] || LANG_HUMAN[code.split("-")[0]] || code;
}

async function buildReadiness(targetLang: string, nativeLang: string, mode?: OfflineMode): Promise<OfflineReadiness> {
  const [speech, tts, nativeTts] = await Promise.all([
    getNativeSpeechReadinessStatus(targetLang),
    getOfflineTtsStatus(targetLang),
    getOfflineTtsStatus(nativeLang),
  ]);
  const gemma = getGemmaState();

  log("readiness", {
    sttLocale: speech.locale,
    resolvedLocale: speech.resolvedLocale,
    recognizerExists: speech.localeSupported,
    recognitionAvailable: speech.recognitionAvailable,
    supportsOnDeviceRecognition: speech.onDeviceSupported,
    micPermission: speech.permissionGranted,
    targetTtsVoice: tts.voiceIdentifier || tts.voiceName || "",
    nativeTtsVoice: nativeTts.voiceIdentifier || nativeTts.voiceName || "",
    gemmaLoaded: gemma.loaded,
    gemmaLoading: gemma.loading,
    gemmaError: gemma.error,
  });

  let blockingMessage: string | undefined;
  let blockingAction: OfflineReadiness["blockingAction"];

  if (!speech.moduleAvailable) {
    blockingMessage = "Speech recognition is unavailable in this build. Rebuild the dev app to enable voice.";
    blockingAction = "rebuild";
  } else if (!speech.permissionGranted) {
    blockingMessage = speech.permissionCanAskAgain
      ? "Allow microphone access to start voice practice."
      : "Microphone is blocked. Open iOS Settings → Lang → Microphone and enable it.";
    blockingAction = "permission";
  }
  // Note: We intentionally do NOT block on recognitionAvailable/localeSupported here.
  // expo-speech-recognition may report false negatives on physical devices even when
  // SFSpeechRecognizer is fully functional. If the module is present and mic is
  // granted, we let the user attempt recognition — the native bridge will surface
  // any real failure inline.

  // Live Lang (translate mode) REQUIRES the real Gemma model — stubs produce
  // garbage translations. Block here so the user sees a clear "Download Model"
  // screen instead of nonsense output.
  //
  // Exceptions to blocking:
  //   1. Model is currently loading (auto-load from cache) — show a soft wait
  //      state instead of "Download" since it will resolve on its own.
  //   2. Model is already loaded and NOT on stub — fully ready.
  if (!blockingMessage && mode === "translate") {
    if (!isGemmaSupported()) {
      // Native module not linked — cannot run Gemma at all.
      blockingMessage = "Live translation requires a dev build with the AI engine. Rebuild with `expo run:ios`.";
      blockingAction = "rebuild";
    } else if (gemma.loading) {
      // Model is currently loading from cache — don't block, just let the
      // subscribeGemmaState watcher in OfflineVoicePanel clear it when done.
      // Return ready:false with a soft "loading" action so the panel shows a spinner.
      blockingMessage = "Loading AI model…";
      blockingAction = "load-model";
    } else if (gemma.usingStub || !gemma.loaded) {
      // Model not loading and not ready — user needs to download.
      blockingMessage = "Live Lang needs the AI model for real-time translation. Download it to get started (~2.5 GB, one-time).";
      blockingAction = "load-model";
    }
    // else: gemma.loaded && !gemma.usingStub → model ready, no block
  }

  return {
    ready: !blockingMessage,
    blockingMessage,
    blockingAction,
    speech,
    tts,
    nativeTts,
    gemma: { loaded: gemma.loaded, loading: gemma.loading, error: gemma.error },
  };
}

export function createOfflineVoiceSession(opts: OfflineVoiceSessionOpts): OfflineVoiceController {
  const budgets = opts.continuous ? LIVE_BUDGETS : QUICK_BUDGETS;
  let snap: OfflineVoiceSnapshot = {
    state: "idle",
    partialTranscript: "",
    lastUserText: "",
    lastResponse: null,
    lastTranslation: "",
    errorMessage: "",
    micLevel: 0,
  };
  const listeners = new Set<(s: OfflineVoiceSnapshot) => void>();
  let session: NativeSpeechSession | null = null;
  let stopped = true;
  let loopRunning = false;
  let currentTurnID = 0;
  let latestReadiness: OfflineReadiness | null = null;
  let stateWatchdog: ReturnType<typeof setTimeout> | null = null;
  let prewarmPromise: Promise<void> | null = null;

  function emit(): void {
    const copy = { ...snap };
    listeners.forEach((fn) => fn(copy));
  }

  function isCurrent(turnID: number): boolean {
    return !stopped && turnID === currentTurnID;
  }

  function nextTurn(): number {
    currentTurnID += 1;
    return currentTurnID;
  }

  function setSnap(patch: Partial<OfflineVoiceSnapshot>): void {
    const prev = snap.state;
    snap = { ...snap, ...patch };
    if (patch.state && !("errorMessage" in patch)) snap.errorMessage = "";
    if (patch.state && patch.state !== prev) {
      log("state", prev, "->", patch.state);
      armStateWatchdog(patch.state);
    }
    emit();
  }

  function armStateWatchdog(state: OfflineVoiceState): void {
    if (stateWatchdog) clearTimeout(stateWatchdog);
    if (stopped) return;
    const ms =
      state === "listening" ? budgets.listenMs + 3_000 :
      state === "recognizing" ? 5_000 :
      state === "processing" ? 9_000 :
      state === "speaking" ? 24_000 :
      0;
    if (!ms) return;
    const turnID = currentTurnID;
    stateWatchdog = setTimeout(() => {
      if (!isCurrent(turnID) || snap.state !== state) return;
      log("watchdog reset", { state, turnID });
      void resetToListening("watchdog");
    }, ms);
  }

  async function resetToListening(reason: string): Promise<void> {
    if (stopped) return;
    log("reset to listening", reason);
    nextTurn();
    try { session?.abort(); } catch { /* ignore */ }
    session = null;
    await stopOfflineTts().catch(() => {});
    setSnap({ state: "ready", partialTranscript: "", micLevel: 0, errorMessage: "" });
    if (opts.continuous) scheduleLoop();
  }

  async function audioModeRecord(): Promise<void> {
    try {
      await Audio.setIsEnabledAsync(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      log("audio session", "listening/playAndRecord");
    } catch (err) {
      log("audio session record failed", (err as Error)?.message);
    }
  }

  async function audioModePlayback(): Promise<void> {
    try {
      try { session?.abort(); } catch { /* ignore */ }
      session = null;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      log("audio session", "speaking/playback");
    } catch (err) {
      log("audio session playback failed", (err as Error)?.message);
    }
  }

  async function prewarm(readiness: OfflineReadiness): Promise<void> {
    if (prewarmPromise) return prewarmPromise;
    prewarmPromise = (async () => {
      log("prewarm start", {
        sttLocale: readiness.speech.locale,
        onDevice: readiness.speech.onDeviceSupported,
        ttsVoice: readiness.tts.voiceIdentifier || readiness.tts.voiceName || "",
        gemmaLoaded: readiness.gemma.loaded,
      });
      await getOfflineTtsStatus(opts.targetLang).catch(() => null);
      if (getGemmaState().loaded) {
        const started = Date.now();
        await chatWithGemma(
          [
            { role: "system", content: "Reply with one short word." },
            { role: "user", content: "ready" },
          ],
          { maxTokens: 4, temperature: 0 },
        ).catch((err: unknown) => log("gemma prewarm failed", (err as Error)?.message));
        log("gemma prewarm ms", Date.now() - started);
      }
    })();
    return prewarmPromise;
  }

  function makeNoiseTracker() {
    let floor = 0.035;
    let lastSpeechAt = 0;
    let quietSince = Date.now();
    return {
      update(level: number) {
        const now = Date.now();
        const clamped = Math.max(0, Math.min(1, level));
        const delta = Math.max(SPEECH_DELTA_MIN, Math.min(SPEECH_DELTA_MAX, floor * 1.8));
        const isSpeech = clamped > floor + delta;
        if (isSpeech) {
          lastSpeechAt = now;
        } else {
          floor = floor * 0.94 + clamped * 0.06;
          quietSince = quietSince || now;
        }
        if (!isSpeech && now - Math.max(lastSpeechAt, quietSince) > NOISE_RESET_MS) {
          floor = floor * 0.5 + clamped * 0.5;
          quietSince = now;
        }
        floor = Math.max(0.01, Math.min(0.32, floor));
        return { level: clamped, floor, threshold: floor + delta, isSpeech };
      },
    };
  }

  function listenOnce(turnID: number): Promise<string> {
    return new Promise((resolve) => {
      let bestText = "";
      let resolved = false;
      let heardSpeech = false;
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      let noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
      let hardTimer: ReturnType<typeof setTimeout> | null = null;
      const noise = makeNoiseTracker();

      const finish = (text: string): void => {
        if (resolved) return;
        resolved = true;
        if (silenceTimer) clearTimeout(silenceTimer);
        if (noSpeechTimer) clearTimeout(noSpeechTimer);
        if (hardTimer) clearTimeout(hardTimer);
        try { session?.stop(); } catch { /* ignore */ }
        session = null;
        const clean = text.trim();
        log("speech stop", { turnID, text: clean, heardSpeech });
        resolve(clean);
      };

      const armSilenceTimer = (): void => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => finish(bestText), opts.continuous ? SILENCE_MS_LIVE : SILENCE_MS_QUICK);
      };

      const readiness = latestReadiness;
      // Tap-to-speak should start the microphone reliably. Allow Apple's
      // recognizer to choose the available path for STT; text generation still
      // runs through local Gemma after transcription.
      const useOnDevice = false;
      const locale = speechLocaleFor(opts.targetLang);
      setSnap({ state: "listening", partialTranscript: "", micLevel: 0 });
      log("speech start", {
        turnID,
        locale,
        requiresOnDevice: useOnDevice,
        recognizerExists: readiness?.speech.localeSupported,
        supportsOnDeviceRecognition: readiness?.speech.onDeviceSupported,
      });

      void audioModeRecord()
        .then(() =>
          startNativeSpeechSession({
            languageCode: opts.targetLang,
            fallbackLanguageCode: opts.nativeLang,
            requiresOnDevice: useOnDevice,
            continuous: false,
            onResult: (text, isFinal) => {
              if (!isCurrent(turnID)) return;
              bestText = text || bestText;
              if (bestText.trim()) {
                heardSpeech = true;
                if (noSpeechTimer) {
                  clearTimeout(noSpeechTimer);
                  noSpeechTimer = null;
                }
                armSilenceTimer();
              }
              if (isFinal) {
                setSnap({ state: "recognizing", partialTranscript: bestText });
                finish(bestText);
              } else {
                setSnap({ partialTranscript: bestText });
              }
            },
            onError: (msg) => {
              log("speech error", { turnID, msg, heardSpeech, bestText });
              finish(bestText);
            },
            onEnd: () => finish(bestText),
            onVolume: (lvl) => {
              if (!isCurrent(turnID)) return;
              const sample = noise.update(lvl);
              setSnap({ micLevel: sample.level });
              if (sample.isSpeech) {
                heardSpeech = true;
                if (noSpeechTimer) {
                  clearTimeout(noSpeechTimer);
                  noSpeechTimer = null;
                }
                armSilenceTimer();
              }
            },
          })
        )
        .then((s) => {
          if (!isCurrent(turnID)) {
            s.abort();
            return;
          }
          session = s;
        })
        .catch((err) => {
          log("speech session failed", { turnID, message: (err as Error)?.message });
          finish(bestText);
        });

      noSpeechTimer = setTimeout(() => finish(""), NO_SPEECH_MS);
      hardTimer = setTimeout(() => finish(bestText), budgets.listenMs);
    });
  }

  async function processTutor(text: string, turnID: number): Promise<TutorResponse> {
    const req: TutorRequest = {
      mode: "quick-ask",
      languageCode: opts.targetLang,
      nativeLanguageCode: opts.nativeLang,
      text,
      includeAudio: false,
    };

    if (!isCurrent(turnID)) throw new Error("stale_turn");
    const started = Date.now();
    console.log("[offline-voice] MODEL USED: GEMMA");
    const res = await runWithTimeout(
      "offline.tutor",
      () => postTutorSessionGemma(req),
      GEMMA_TURN_TIMEOUT_MS,
    );
    log("provider used", { stage: "llm", provider: "gemma" as Provider, latencyMs: Date.now() - started });
    if (res.naturalPhrase || res.audioText || res.localReply) {
      return res;
    }
    throw new Error("Gemma returned an empty tutor response.");
  }

  const TRANSLATE_STEP_TIMEOUT = 1500;

  async function processTranslate(text: string, turnID: number): Promise<string> {
    if (!isCurrent(turnID)) throw new Error("stale_turn");
    // Stub can now attempt translation — no hard guard. The 4-step cascade
    // below guarantees output even if the model is unavailable.
    const started = Date.now();
    const fromLang = humanLang(opts.targetLang);
    const toLang = humanLang(opts.nativeLang);
    console.log("[offline-voice] MODEL USED: GEMMA");
    console.log("[offline-voice] GEMMA INPUT:", JSON.stringify({ text, from: opts.targetLang, to: opts.nativeLang }));
    // Language-specific prompts with examples — the 1B model needs very
    // concrete instructions to reliably output in the correct target language.
    const fromCode = opts.targetLang.slice(0, 2);
    const toCode = opts.nativeLang.slice(0, 2);
    let sys: string;
    if (toCode === "en") {
      // Most common Live Lang use case: hear target language → show English
      const exampleMap: Record<string, string> = {
        zh: `Translate the Chinese text to English. Write only the English meaning. Example: 你好 → Hello. Example: 谢谢 → Thank you.`,
        es: `Translate Spanish to English. Write only the English translation. Example: Buenos días → Good morning. Example: Gracias → Thank you.`,
        fr: `Translate French to English. Write only the English translation. Example: Bonjour → Hello. Example: Merci → Thank you.`,
      };
      sys = exampleMap[fromCode] ?? `Translate ${fromLang} to English. Write only the English translation. Nothing else.`;
    } else if (fromCode === "en") {
      sys = `Translate English to ${toLang}. Write only the ${toLang} translation. Nothing else.`;
    } else {
      sys = `Translate ${fromLang} to ${toLang}. Write only the ${toLang} translation. Nothing else.`;
    }
    const out = await runWithTimeout(
      "offline.translate",
      () => chatWithGemma(
        [
          { role: "system", content: sys },
          { role: "user", content: text },
        ],
        { maxTokens: 160, temperature: 0.1 },
      ),
      GEMMA_TURN_TIMEOUT_MS,
    );
    console.log("[offline-voice] GEMMA OUTPUT:", JSON.stringify({ out }));
    const clean = cleanTranslation(out);
    if (!clean) {
      throw new Error("Gemma returned an empty translation.");
    }

    // Validate: if the output is suspiciously similar to the input or looks
    // like it's still in the source language, reject it. For translations TO
    // English, the output should be mostly ASCII. For translations FROM
    // English, the output should differ from the input.
    if (clean.toLowerCase().trim() === text.toLowerCase().trim()) {
      console.warn("[offline-voice] Translation echoed input — rejecting");
      throw new Error("Translation echoed input.");
    }
    // Simple heuristic: if translating to English and output is >60% non-ASCII,
    // the model probably responded in the source language.
    if (opts.nativeLang.startsWith("en")) {
      const nonAscii = clean.replace(/[\x00-\x7F]/g, "").length;
      if (nonAscii > clean.length * 0.4) {
        console.warn("[offline-voice] Translation still in source language — rejecting");
        throw new Error("Translation in wrong language.");
      }
    }

    // Reject conversational / coaching responses that aren't real translations.
    // A real translation should NOT be a question or a coaching prompt.
    const looksConversational = /^(what|how|would you|do you|let me|i can|sure|of course|that means)/i.test(clean)
      || (clean.includes("?") && clean.length > text.length * 2);
    if (!looksConversational) {
      log("provider used", { stage: "translate", provider: "gemma" as Provider, latencyMs: Date.now() - started });
      return clean;
    }

    // First attempt was conversational — retry with ultra-terse prompt.
    console.warn("[offline-voice] Conversational response detected, retrying with terse prompt:", clean.slice(0, 80));
    const terseSys = toCode === "en"
      ? `Output ONLY the English translation of the input. No explanation. No questions.`
      : `Output ONLY the ${toLang} translation of the input. No explanation. No questions.`;
    const out2 = await runWithTimeout(
      "offline.translate.retry",
      () => chatWithGemma(
        [
          { role: "system", content: terseSys },
          { role: "user", content: `${text} =` },
        ],
        { maxTokens: 100, temperature: 0.0 },
      ),
      GEMMA_TURN_TIMEOUT_MS,
    );
    const clean2 = cleanTranslation(out2);
    if (!clean2 || clean2.toLowerCase().trim() === text.toLowerCase().trim()) {
      throw new Error("Translation retry also failed.");
    }
    log("provider used", { stage: "translate.retry", provider: "gemma" as Provider, latencyMs: Date.now() - started });
    return clean2;
  }

  async function speak(text: string, lang: string, turnID: number): Promise<void> {
    const clean = text.trim();
    if (!clean || !isCurrent(turnID)) return;
    setSnap({ state: "speaking" });
    await audioModePlayback();
    log("tts routing", { lang, turnID });

    let hardTimerHandle: ReturnType<typeof setTimeout> | null = null;
    const hardTimer = new Promise<void>((resolve) => {
      hardTimerHandle = setTimeout(() => {
        log("tts watchdog stop", { turnID });
        void stopRoutedTts().then(() => stopOfflineTts()).finally(resolve);
      }, 24_000);
    });

    try {
      // Route through the TTS router: online → Deepgram, offline → native.
      // The router does a real connectivity check per-request (5s cache).
      await Promise.race([
        speakRoutedText({ text: clean, languageCode: lang, rate: 1 }),
        hardTimer,
      ]);
    } catch (err) {
      log("tts failed", (err as Error)?.message);
    } finally {
      if (hardTimerHandle) clearTimeout(hardTimerHandle);
    }
  }

  async function runLoop(): Promise<void> {
    if (loopRunning) return;
    loopRunning = true;
    try {
      while (!stopped) {
        const turnID = nextTurn();
        const rawTranscript = await listenOnce(turnID);
        if (!isCurrent(turnID)) continue;
        if (!rawTranscript) {
          setSnap({ state: "ready", partialTranscript: "", micLevel: 0, errorMessage: "Didn't catch that — try again." });
          if (!opts.continuous) return;
          await delay(300);
          continue;
        }

        // Truncate very long transcripts to prevent crashes downstream
        const words = rawTranscript.split(/\s+/);
        const transcript = words.length > 40
          ? words.slice(0, 40).join(" ")
          : rawTranscript;
        log("transcript", { words: words.length, text: transcript.slice(0, 80) });

        setSnap({ state: "processing", lastUserText: transcript, partialTranscript: "", micLevel: 0 });

        try {
          if (opts.mode === "tutor") {
            const res = await processTutor(transcript, turnID);
            if (!isCurrent(turnID)) continue;
            // Quick Mode speaks only the natural phrase in the target language.
            // The full coaching narration is shown on the card.
            const spoken =
              res.naturalPhrase ||
              res.localReply ||
              res.audioText;
            setSnap({ lastResponse: res });
            opts.onLine?.({ source: transcript, translation: res.naturalPhrase || spoken });
            if (!opts.skipTts) await speak(spoken, opts.targetLang, turnID);
          } else {
            // ── 4-step deterministic translate cascade ────────────────────
            // Every transcript MUST produce output. Never blank UI or error.
            let output: string | null = null;

            // Step 1: Gemma translation (timeout: TRANSLATE_STEP_TIMEOUT)
            try {
              output = await runWithTimeout(
                "cascade.step1",
                () => processTranslate(transcript, turnID),
                TRANSLATE_STEP_TIMEOUT,
              );
            } catch (e1) {
              log("cascade step1 failed", (e1 as Error)?.message);
            }

            // Step 2: Retry with simplified input — strip filler words
            if (!output && isCurrent(turnID)) {
              try {
                const simplified = transcript.replace(/\b(uh|um|like|you know|well|so|basically)\b/gi, "").trim();
                if (simplified.length > 2) {
                  output = await runWithTimeout(
                    "cascade.step2",
                    () => processTranslate(simplified, turnID),
                    TRANSLATE_STEP_TIMEOUT,
                  );
                }
              } catch (e2) {
                log("cascade step2 failed", (e2 as Error)?.message);
              }
            }

            // Step 3: Stub dictionary + word-table translation (instant, no timeout)
            // Uses translateLine which handles BOTH directions:
            //   zh→en, es→en, fr→en (Live Lang hearing mode)
            //   en→zh, en→es, en→fr (via composeLocalTranslation)
            if (!output && isCurrent(turnID)) {
              try {
                const fromCode = opts.targetLang.slice(0, 2);
                const toCode = opts.nativeLang.slice(0, 2);
                const dictResult = translateLine(transcript, fromCode, toCode);
                if (dictResult) {
                  output = dictResult;
                } else {
                  // Fallback: composeLocalTranslation for en→target direction
                  const local = composeLocalTranslation(transcript, toCode);
                  if (local?.phrase) output = local.phrase;
                }
              } catch (e3) {
                log("cascade step3 failed", (e3 as Error)?.message);
              }
            }

            // Step 4: NEVER echo the source text as a fake "translation".
            // Show a clear message so the user knows translation failed.
            if (!output) {
              output = "(Translation unavailable)";
              log("cascade step4 fallback", { transcript: transcript.slice(0, 60) });
            }

            if (!isCurrent(turnID)) continue;
            setSnap({ lastTranslation: output });
            opts.onLine?.({ source: transcript, translation: output });
            if (!opts.skipTts) await speak(output, opts.nativeLang, turnID);
          }
        } catch (err) {
          if (!isCurrent(turnID)) continue;
          log("gemma turn error", (err as Error)?.message);
          // Soft error — show transcript as fallback instead of error state
          setSnap({
            state: "ready",
            partialTranscript: "",
            micLevel: 0,
          });
          opts.onLine?.({ source: transcript, translation: "(Translation unavailable)" });
          if (!opts.continuous) return;
          await delay(250);
          continue;
        }

        if (!isCurrent(turnID)) continue;
        setSnap({ state: "ready", partialTranscript: "", micLevel: 0 });
        if (!opts.continuous) return;
        await delay(250);
      }
    } catch (err) {
      if (!stopped) {
        log("voice loop error", (err as Error)?.message);
        setSnap({ state: "error", errorMessage: "Error" });
      }
    } finally {
      loopRunning = false;
    }
  }

  function scheduleLoop(): void {
    if (loopRunning || stopped) return;
    void runLoop();
  }

  async function checkReadiness(): Promise<OfflineReadiness> {
    stopped = true;
    nextTurn();
    setSnap({ state: "checking", errorMessage: "" });
    const r = await buildReadiness(opts.targetLang, opts.nativeLang, opts.mode);
    latestReadiness = r;
    if (!r.ready) {
      setSnap({ state: "error", errorMessage: r.blockingMessage || "Error" });
    } else {
      setSnap({ state: "ready", errorMessage: "" });
      void prewarm(r);
    }
    return r;
  }

  async function start(): Promise<void> {
    if (snap.state === "speaking") {
      log("tts interrupted by user");
      nextTurn();
      await stopOfflineTts().catch(() => {});
    } else if (snap.state === "listening" || snap.state === "processing" || snap.state === "recognizing") {
      log("start ignored; active state", snap.state);
      return;
    }

    if (!latestReadiness?.ready) {
      const r = await checkReadiness();
      if (!r.ready) return;
    }

    stopped = false;
    setSnap({ state: "ready", errorMessage: "" });
    scheduleLoop();
  }

  async function stop(): Promise<void> {
    stopped = true;
    nextTurn();
    if (stateWatchdog) {
      clearTimeout(stateWatchdog);
      stateWatchdog = null;
    }
    try { session?.abort(); } catch { /* ignore */ }
    session = null;
    await stopOfflineTts().catch(() => {});
    setSnap({ state: "stopped", partialTranscript: "", micLevel: 0, errorMessage: "" });
  }

  // Text submission path: bypasses STT, but runs the same Gemma
  // pipeline plus the same auto-TTS. Used by Quick Mode's "type a phrase"
  // input. Cancels any active turn first so it can't collide with the loop.
  async function submitText(text: string): Promise<void> {
    const clean = text.trim();
    if (!clean) return;
    // Make sure readiness has been resolved at least once.
    if (!latestReadiness?.ready) {
      const r = await checkReadiness();
      if (!r.ready) return;
    }
    // Cancel any in-flight listening/processing turn — typed input wins.
    stopped = true;
    nextTurn();
    try { session?.abort(); } catch { /* ignore */ }
    session = null;
    await stopOfflineTts().catch(() => {});

    const turnID = nextTurn();
    stopped = false;
    setSnap({
      state: "processing",
      lastUserText: clean,
      partialTranscript: "",
      micLevel: 0,
    });

    try {
      if (opts.mode === "tutor") {
        const res = await processTutor(clean, turnID);
        if (!isCurrent(turnID)) return;
        const spoken =
          res.naturalPhrase ||
          res.localReply ||
          res.audioText;
        setSnap({ lastResponse: res });
        opts.onLine?.({ source: clean, translation: res.naturalPhrase || spoken });
        if (!opts.skipTts) await speak(spoken, opts.targetLang, turnID);
      } else {
        // ── 4-step deterministic translate cascade (same as runLoop) ──────
        let output: string | null = null;

        // Step 1: Gemma translation
        try {
          output = await runWithTimeout(
            "submit.step1",
            () => processTranslate(clean, turnID),
            TRANSLATE_STEP_TIMEOUT,
          );
        } catch (e1) {
          log("submit step1 failed", (e1 as Error)?.message);
        }

        // Step 2: Retry with simplified input
        if (!output && isCurrent(turnID)) {
          try {
            const simplified = clean.replace(/\b(uh|um|like|you know|well|so|basically)\b/gi, "").trim();
            if (simplified.length > 2) {
              output = await runWithTimeout(
                "submit.step2",
                () => processTranslate(simplified, turnID),
                TRANSLATE_STEP_TIMEOUT,
              );
            }
          } catch (e2) {
            log("submit step2 failed", (e2 as Error)?.message);
          }
        }

        // Step 3: Stub dictionary + composeLocalTranslation
        if (!output && isCurrent(turnID)) {
          try {
            const fromCode = opts.targetLang.slice(0, 2);
            const toCode = opts.nativeLang.slice(0, 2);
            const dictResult = translateLine(clean, fromCode, toCode);
            if (dictResult) {
              output = dictResult;
            } else {
              const local = composeLocalTranslation(clean, toCode);
              if (local?.phrase) output = local.phrase;
            }
          } catch (e3) {
            log("submit step3 failed", (e3 as Error)?.message);
          }
        }

        // Step 4: Never blank — show fallback
        if (!output) {
          output = "(Translation unavailable)";
          log("submit step4 fallback", { text: clean.slice(0, 60) });
        }

        if (!isCurrent(turnID)) return;
        setSnap({ lastTranslation: output });
        opts.onLine?.({ source: clean, translation: output });
        if (!opts.skipTts) await speak(output, opts.nativeLang, turnID);
      }
    } catch (err) {
      log("submitText error", (err as Error)?.message);
      setSnap({ state: "error", errorMessage: (err as Error)?.message || "Error" });
      return;
    }

    if (!isCurrent(turnID)) return;
    setSnap({ state: "ready", partialTranscript: "", micLevel: 0 });
    stopped = true;  // submitText is one-shot — don't auto-resume the mic loop.
  }

  return {
    getState: () => ({ ...snap }),
    subscribe: (fn) => {
      listeners.add(fn);
      fn({ ...snap });
      return () => { listeners.delete(fn); };
    },
    checkReadiness,
    start,
    stop,
    submitText,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanTranslation(text: string): string {
  return text
    .trim()
    .replace(/^["“”'`]+|["“”'`]+$/g, "")
    .replace(/^(translation|reply|answer|output)\s*[:：-]\s*/i, "")
    .trim();
}

export { ttsLocaleFor };
