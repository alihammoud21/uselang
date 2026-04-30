import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";
import { SUPPORTED_LANGUAGES } from "./constants";

export interface NativeSpeechSession {
  stop: () => void;
  abort: () => void;
}

export interface NativeSpeechOptions {
  languageCode: string;
  fallbackLanguageCode?: string;
  requiresOnDevice?: boolean;
  continuous?: boolean;
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
  onVolume?: (level: number) => void;
  onAudioReset?: (reason: string) => void;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const SILENCE_AFTER_SPEECH_MS = 2_000; // wait 2s of silence after speech before finalizing
const MIN_LISTEN_MS = 1_500; // never finalize before 1.5s to prevent premature cutoff
export const OFFLINE_STT_UNSUPPORTED_MESSAGE =
  "Offline speech recognition isn't installed for this language. Open iOS Settings → General → Keyboard → Dictation, enable the language, then go to Siri & Search → Language and pick it. iOS will download the offline pack.";

function dlog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log("[native-speech]", ...args);
}

export interface NativeSpeechReadinessStatus {
  moduleAvailable: boolean;
  locale: string;
  resolvedLocale?: string;
  permissionGranted: boolean;
  permissionCanAskAgain: boolean;
  recognitionAvailable: boolean;
  localeSupported: boolean;
  onDeviceSupported: boolean;
  message?: string;
}

type NativeOfflineVoiceModule = {
  getSpeechStatus?: (locale: string) => Promise<{
    moduleAvailable?: boolean;
    locale?: string;
    resolvedLocale?: string;
    localeSupported?: boolean;
    recognitionAvailable?: boolean;
    onDeviceSupported?: boolean;
    message?: string;
  }>;
  requestSpeechAuthorization?: () => Promise<{ status: number; granted: boolean }>;
  startSpeech?: (options: { locale: string; requiresOnDevice: boolean }) => Promise<{ started: boolean; locale: string }>;
  stopSpeech?: () => Promise<void>;
  abortSpeech?: () => Promise<void>;
};

function getSpeechModule(): any | null {
  try {
    return require("expo-speech-recognition").ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

function getOfflineVoiceModule(): NativeOfflineVoiceModule | null {
  return Platform.OS === "ios"
    ? ((NativeModules as any).OfflineVoiceModule as NativeOfflineVoiceModule | undefined) ?? null
    : null;
}

function getOfflineVoiceEventEmitter(): NativeEventEmitter | null {
  const native = getOfflineVoiceModule();
  return native ? new NativeEventEmitter(native as any) : null;
}

export function speechLocaleFor(code: string): string {
  // Critical: never strip a code like "zh-CN" down to "zh". Apple's
  // SFSpeechRecognizer is locale-specific — Mandarin needs "zh-CN" exactly.
  const direct = SUPPORTED_LANGUAGES.find((l) => l.code === code || l.sttCode === code || l.locale === code);
  if (direct?.locale) return direct.locale;
  if (code.includes("-")) return code;
  // Common hand-mappings for unqualified codes
  if (code === "zh") return "zh-CN";
  if (code === "en") return "en-US";
  if (code === "es") return "es-ES";
  if (code === "fr") return "fr-FR";
  if (code === "pt") return "pt-BR";
  return `${code}-US`;
}

export function isNativeSpeechAvailable(): boolean {
  const module = getSpeechModule();
  if (!module) return false;
  try {
    return module.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export function supportsOnDeviceSpeech(): boolean {
  const module = getSpeechModule();
  if (!module) return false;
  try {
    return module.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

export async function ensureNativeSpeechPermission(requiresOnDevice = true): Promise<void> {
  // On iOS we have a custom Swift bridge (OfflineVoiceModule) that owns the
  // SFSpeechRecognizer authorization flow. Use it FIRST so devices that ship
  // without expo-speech-recognition's JS module (e.g. some dev builds) still
  // get a working mic permission prompt. The custom bridge also primes
  // SFSpeechRecognizer authorization, which on a fresh install is required
  // before any locale will report `localeSupported`.
  if (Platform.OS === "ios") {
    const native = getOfflineVoiceModule();
    if (native?.requestSpeechAuthorization) {
      try {
        await native.requestSpeechAuthorization();
      } catch (e) {
        dlog("native speech authorization failed:", (e as Error)?.message);
      }
    }
  }

  const module = getSpeechModule();
  if (!module) {
    // Even without the expo module, the native bridge alone can drive
    // recognition on iOS. Don't throw here — let the caller continue and
    // hit the native bridge directly if it's available.
    if (Platform.OS === "ios" && getOfflineVoiceModule()) return;
    throw new Error("Speech recognition isn't initialized yet. Allow microphone + speech access, then make sure the language is installed under iOS Settings → General → Keyboard → Dictation.");
  }
  const result =
    requiresOnDevice && Platform.OS === "ios"
      ? await module.requestMicrophonePermissionsAsync()
      : await module.requestPermissionsAsync();
  if (!result.granted) {
    throw new Error(
      result.canAskAgain === false
        ? "Microphone permission denied. Enable it in Settings → UseLang → Microphone."
        : "Microphone permission denied."
    );
  }
}

export async function requestNativeSpeechMicrophonePermission(): Promise<void> {
  const module = getSpeechModule();
  if (!module) {
    throw new Error("Speech recognition isn't initialized yet. Allow microphone + speech access, then make sure the language is installed under iOS Settings → General → Keyboard → Dictation.");
  }
  const result = await module.requestMicrophonePermissionsAsync();
  if (!result.granted) {
    throw new Error(
      result.canAskAgain === false
        ? "Microphone permission denied. Enable it in Settings -> UseLang -> Microphone."
        : "Microphone permission denied."
    );
  }
}

export async function getNativeSpeechReadinessStatus(languageCode: string): Promise<NativeSpeechReadinessStatus> {
  const locale = speechLocaleFor(languageCode);
  const module = getSpeechModule();
  const native = getOfflineVoiceModule();

  let permissionGranted = false;
  let permissionCanAskAgain = true;
  try {
    const mic = module?.getMicrophonePermissionsAsync
      ? await module.getMicrophonePermissionsAsync()
      : { granted: false, canAskAgain: true };
    permissionGranted = !!mic.granted;
    permissionCanAskAgain = mic.canAskAgain !== false;
  } catch {
    permissionGranted = false;
  }

  if (Platform.OS === "ios" && native?.requestSpeechAuthorization) {
    try {
      await native.requestSpeechAuthorization();
      // If we reach here without throwing, iOS speech auth is authorized →
      // microphone permission is also implicitly granted.
      permissionGranted = true;
    } catch (e) {
      dlog("native speech authorization request failed:", (e as Error)?.message);
    }
  }
  if (native?.getSpeechStatus) {
    try {
      const status = await native.getSpeechStatus(locale);
      dlog("native bridge readiness:", { locale, ...status });
      // If the native bridge reports recognition is available, both speech +
      // mic permissions must be granted — override any stale expo-module value.
      const nativeReady = !!status.recognitionAvailable;
      return {
        moduleAvailable: true,
        locale,
        resolvedLocale: status.resolvedLocale,
        permissionGranted: permissionGranted || nativeReady,
        permissionCanAskAgain,
        recognitionAvailable: nativeReady,
        localeSupported: !!status.localeSupported,
        onDeviceSupported: !!status.onDeviceSupported,
        message: status.message || undefined,
      };
    } catch (e) {
      dlog("native bridge readiness failed, falling back to expo module:", (e as Error)?.message);
    }
  }

  if (!module) {
    return {
      moduleAvailable: false,
      locale,
      permissionGranted,
      permissionCanAskAgain,
      recognitionAvailable: false,
      localeSupported: false,
      onDeviceSupported: false,
      message: "Speech recognition isn't initialized yet. Allow microphone + speech access, then make sure the language is installed under iOS Settings → General → Keyboard → Dictation.",
    };
  }

  // expo-speech-recognition exposes `getSupportedLocales({})` which returns
  // both:
  //   • locales[]            — every locale the recognizer SDK knows about
  //   • installedLocales[]   — the subset actually present on disk for offline
  // For an honest "can I recognize Mandarin offline?" answer we must check
  // installedLocales. supportsOnDeviceRecognition() is a device-wide flag
  // that says "this device can do on-device recognition for SOME language."
  let localeSupported = true;
  let onDeviceLocaleSupported = false;
  let resolvedLocale: string | undefined;

  try {
    if (module.getSupportedLocales) {
      const all = await module.getSupportedLocales({});
      const installed: string[] = Array.isArray(all?.installedLocales) ? all.installedLocales : [];
      const known: string[] = Array.isArray(all?.locales) ? all.locales : [];
      const base = locale.split("-")[0];

      const knownMatch =
        known.find((l: string) => l === locale) ||
        known.find((l: string) => l.toLowerCase() === locale.toLowerCase()) ||
        known.find((l: string) => l.startsWith(`${base}-`));
      localeSupported = !!knownMatch;
      if (knownMatch) resolvedLocale = knownMatch;

      const installedMatch =
        installed.find((l: string) => l === locale) ||
        installed.find((l: string) => l.toLowerCase() === locale.toLowerCase()) ||
        installed.find((l: string) => l.startsWith(`${base}-`));
      onDeviceLocaleSupported = !!installedMatch;
      if (installedMatch) resolvedLocale = installedMatch;

      dlog("getSupportedLocales:", {
        locale,
        knownCount: known.length,
        installedCount: installed.length,
        installed: installed.slice(0, 12),
        knownMatch,
        installedMatch,
      });
    }
  } catch (e) {
    dlog("getSupportedLocales threw:", (e as Error)?.message);
    localeSupported = false;
  }

  const recognitionAvailable = isNativeSpeechAvailable();
  const supportsOnDeviceGlobal = supportsOnDeviceSpeech();
  // For on-device recognition we require:
  //   1. the recognizer is available at all
  //   2. the device supports on-device recognition globally
  //   3. the specific locale is in installedLocales OR (fallback) at least
  //      known to the SDK and the device flag is on — some iOS versions
  //      don't populate installedLocales for Apple's recognizer even when the
  //      pack is present, so we don't make this an absolute hard gate.
  const onDeviceSupported =
    recognitionAvailable &&
    supportsOnDeviceGlobal &&
    (onDeviceLocaleSupported || localeSupported);

  dlog("readiness summary:", {
    locale,
    resolvedLocale,
    permissionGranted,
    recognitionAvailable,
    supportsOnDeviceGlobal,
    localeSupported,
    onDeviceLocaleSupported,
    onDeviceSupported,
  });

  return {
    moduleAvailable: true,
    locale,
    resolvedLocale,
    permissionGranted,
    permissionCanAskAgain,
    recognitionAvailable,
    localeSupported,
    onDeviceSupported,
    message: onDeviceSupported ? undefined : OFFLINE_STT_UNSUPPORTED_MESSAGE,
  };
}

export async function startNativeSpeechSession(options: NativeSpeechOptions): Promise<NativeSpeechSession> {
  const module = getSpeechModule();
  const requiresOnDevice = options.requiresOnDevice !== false;
  const locale = speechLocaleFor(options.languageCode || options.fallbackLanguageCode || "en");
  const native = getOfflineVoiceModule();
  const emitter = getOfflineVoiceEventEmitter();
  if (Platform.OS === "ios" && native?.startSpeech && emitter) {
    dlog("native iOS session start:", { locale, requiresOnDevice });
    const listeners: Array<{ remove: () => void } | undefined> = [];
    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      listeners?.forEach((listener) => listener?.remove());
    }
    listeners.push(
      emitter.addListener("OfflineSpeechResult", (event: { text?: string; isFinal?: boolean }) => {
        const text = event.text?.trim() || "";
        if (text) options.onResult(text, !!event.isFinal);
      }),
      emitter.addListener("OfflineSpeechError", (event: { message?: string }) => {
        options.onError?.(event.message || "Speech recognition failed.");
      }),
      emitter.addListener("OfflineSpeechEnd", () => {
        cleanup();
        options.onEnd?.();
      }),
      emitter.addListener("OfflineSpeechVolume", (event: { level?: number }) => {
        options.onVolume?.(Math.max(0, Math.min(1, event.level ?? 0)));
      }),
      emitter.addListener("OfflineAudioRouteChange", (event: { reasonName?: string }) => {
        dlog("native route change:", event?.reasonName || "unknown");
        options.onAudioReset?.("route-change");
        cleanup();
        options.onEnd?.();
      }),
      emitter.addListener("OfflineAudioInterruption", (event: { type?: string }) => {
        dlog("native interruption:", event?.type || "unknown");
        if (event?.type === "began") {
          options.onAudioReset?.("interruption");
          cleanup();
          options.onEnd?.();
        }
      }),
    );
    try {
      await native.startSpeech({ locale, requiresOnDevice });
    } catch (e) {
      cleanup();
      throw new Error(`Native speech start failed: ${(e as Error)?.message || "unknown"}`);
    }
    return {
      stop() {
        native.stopSpeech?.().catch(() => {}).finally(cleanup);
      },
      abort() {
        native.abortSpeech?.().catch(() => {}).finally(cleanup);
      },
    };
  }

  if (!module) {
    throw new Error("Speech recognition isn't initialized yet. Allow microphone + speech access, then make sure the language is installed under iOS Settings → General → Keyboard → Dictation.");
  }

  await ensureNativeSpeechPermission(requiresOnDevice);

  if (!isNativeSpeechAvailable()) {
    throw new Error("Speech recognition is not available on this device.");
  }

  dlog("session start:", { locale, requiresOnDevice, continuous: options.continuous });
  const listeners: Array<{ remove: () => void } | undefined> = [];
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    listeners?.forEach((listener) => listener?.remove());
  }
  listeners.push(
    module.addListener("result", (event: ExpoSpeechRecognitionResultEvent) => {
      const text = event.results?.[0]?.transcript?.trim() || "";
      if (text) options.onResult(text, !!event.isFinal);
    }),
    module.addListener("error", (event: ExpoSpeechRecognitionErrorEvent) => {
      if (event.error === "aborted") return;
      const offlineUnsupported =
        requiresOnDevice &&
        (event.error === "network" ||
          event.error === "language-not-supported" ||
          event.error === "service-not-allowed");
      const message =
        offlineUnsupported
          ? OFFLINE_STT_UNSUPPORTED_MESSAGE
          : event.message || event.error || "Speech recognition failed.";
      options.onError?.(message);
    }),
    module.addListener("end", () => {
      cleanup();
      options.onEnd?.();
    }),
    module.addListener("volumechange", (event: { value?: number }) => {
      const raw = typeof event.value === "number" ? event.value : -2;
      options.onVolume?.(Math.max(0, Math.min(1, (raw + 2) / 12)));
    }),
  );

  try {
    module.start({
      lang: locale,
      interimResults: true,
      continuous: options.continuous ?? false,
      requiresOnDeviceRecognition: requiresOnDevice,
      addsPunctuation: true,
      iosTaskHint: "dictation",
      iosCategory: {
        category: "playAndRecord",
        categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
        mode: "measurement",
      },
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 120,
      },
    });
  } catch (e) {
    cleanup();
    throw new Error(`Expo speech module start failed: ${(e as Error)?.message || "unknown"}`);
  }

  return {
    stop() {
      try {
        module.stop();
      } catch {
        cleanup();
      }
    },
    abort() {
      try {
        module.abort();
      } catch {
        cleanup();
      }
    },
  };
}

export async function recognizeSpeechOnce({
  languageCode,
  fallbackLanguageCode,
  requiresOnDevice = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onPartial,
  onVolume,
  onSession,
}: {
  languageCode: string;
  fallbackLanguageCode?: string;
  requiresOnDevice?: boolean;
  timeoutMs?: number;
  onPartial?: (text: string) => void;
  onVolume?: (level: number) => void;
  onSession?: (session: NativeSpeechSession) => void;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    let bestText = "";
    let settled = false;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let session: NativeSpeechSession | null = null;
    const startedAt = Date.now();
    let lastResultAt = 0;
    let gotAnyResult = false;

    dlog("recognizeSpeechOnce START", { languageCode, requiresOnDevice, timeoutMs });

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      if (hardTimer) clearTimeout(hardTimer);
      if (silenceTimer) clearTimeout(silenceTimer);
      const elapsed = Date.now() - startedAt;
      dlog("recognizeSpeechOnce FINISH", { text: text.slice(0, 60), elapsedMs: elapsed, gotAnyResult });
      session?.stop();
      resolve(text.trim());
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      if (hardTimer) clearTimeout(hardTimer);
      if (silenceTimer) clearTimeout(silenceTimer);
      dlog("recognizeSpeechOnce FAIL", message);
      session?.abort();
      reject(new Error(message));
    };

    // Arms a silence timer: if no new results arrive within SILENCE_AFTER_SPEECH_MS,
    // finalize with whatever we have. This prevents premature cutoff.
    const armSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        // Only finalize if we've listened for at least MIN_LISTEN_MS
        if (Date.now() - startedAt < MIN_LISTEN_MS) {
          armSilenceTimer(); // re-arm, too early
          return;
        }
        dlog("recognizeSpeechOnce SILENCE_TIMEOUT → finalizing");
        finish(bestText);
      }, SILENCE_AFTER_SPEECH_MS);
    };

    startNativeSpeechSession({
      languageCode,
      fallbackLanguageCode,
      requiresOnDevice,
      continuous: false,
      onVolume,
      onResult: (text, isFinal) => {
        lastResultAt = Date.now();
        gotAnyResult = true;
        if (text) bestText = text;
        onPartial?.(bestText);

        if (isFinal) {
          // Apple on-device recognizer fires isFinal very aggressively (1-2s).
          // Instead of resolving immediately, arm a short silence timer so the
          // user can keep speaking if they paused briefly.
          if (Date.now() - startedAt < MIN_LISTEN_MS) {
            dlog("recognizeSpeechOnce isFinal IGNORED (too early)");
            armSilenceTimer();
            return;
          }
          // After min time, give a short window for more speech
          armSilenceTimer();
        } else {
          // Got partial result → speech is ongoing, keep the silence timer fresh
          armSilenceTimer();
        }
      },
      onError: (msg) => {
        // If we already have text, resolve with it instead of failing
        if (bestText.trim()) {
          dlog("recognizeSpeechOnce onError with text, finishing", { msg });
          finish(bestText);
        } else {
          fail(msg);
        }
      },
      onEnd: () => {
        // Session ended (e.g. recognizer stopped itself). Finalize.
        if (!settled) {
          dlog("recognizeSpeechOnce onEnd → finalizing");
          finish(bestText);
        }
      },
    })
      .then((s) => {
        session = s;
        onSession?.(s);
        // Hard timeout: absolute max listening time
        hardTimer = setTimeout(() => {
          dlog("recognizeSpeechOnce HARD_TIMEOUT");
          finish(bestText);
        }, timeoutMs);
      })
      .catch((err) => fail(err?.message || "Speech recognition failed."));
  });
}
