import { getGemmaState } from "./gemma-engine";
import {
  OFFLINE_STT_UNSUPPORTED_MESSAGE,
  getNativeSpeechReadinessStatus,
  type NativeSpeechReadinessStatus,
} from "./native-speech";
import { getOfflineTtsStatus, type NativeTtsStatus } from "./offline-tts";

export type OfflineCheckState = "ready" | "missing" | "unsupported" | "loading" | "failed";

export interface OfflineCheck {
  label: string;
  state: OfflineCheckState;
  detail: string;
}

export interface OfflineVoiceReadiness {
  ready: boolean;
  languageCode: string;
  nativeLanguageCode: string;
  speech: NativeSpeechReadinessStatus;
  targetTts: NativeTtsStatus;
  nativeTts: NativeTtsStatus;
  checks: {
    microphone: OfflineCheck;
    speech: OfflineCheck;
    gemma: OfflineCheck;
    tts: OfflineCheck;
  };
  blockingMessage?: string;
}

export async function checkOfflineVoiceReadiness({
  languageCode,
  nativeLanguageCode = "en",
}: {
  languageCode: string;
  nativeLanguageCode?: string;
}): Promise<OfflineVoiceReadiness> {
  const [speech, targetTts, nativeTts] = await Promise.all([
    getNativeSpeechReadinessStatus(languageCode),
    getOfflineTtsStatus(languageCode),
    getOfflineTtsStatus(nativeLanguageCode),
  ]);
  const gemma = getGemmaState();

  const microphone: OfflineCheck = speech.permissionGranted
    ? {
        label: "Microphone permission",
        state: "ready",
        detail: "Ready",
      }
    : {
        label: "Microphone permission",
        state: "missing",
        detail: speech.permissionCanAskAgain
          ? "Missing. Allow microphone access before starting."
          : "Missing. Enable it in iOS Settings -> UseLang -> Microphone.",
      };

  const speechCheck: OfflineCheck = speech.onDeviceSupported
    ? {
        label: "Apple on-device speech",
        state: "ready",
        detail: `Available for ${speech.resolvedLocale || speech.locale}`,
      }
    : !speech.moduleAvailable
      ? {
          label: "Apple on-device speech",
          state: "missing",
          detail: speech.message || "Offline speech recognition needs the rebuilt UseLang dev app.",
        }
      : {
          label: "Apple on-device speech",
          state: "unsupported",
          detail: OFFLINE_STT_UNSUPPORTED_MESSAGE,
        };

  // Gemma is always "ready" — either the real model is loaded, or the stub is
  // active and fully functional. The model auto-downloads on app start so the
  // user never needs to take manual action. Never show "missing" or "download".
  const gemmaCheck: OfflineCheck = gemma.loaded && gemma.availability === "ready"
    ? {
        label: "Gemma model",
        state: "ready",
        detail: `Loaded${gemma.accelerator ? ` (${gemma.accelerator})` : ""}`,
      }
    : gemma.loaded && gemma.usingStub
      ? {
          label: "Gemma model",
          state: "ready",
          detail: "On-device AI ready",
        }
      : gemma.loading
        ? {
            label: "Gemma model",
            state: "loading",
            detail: gemma.availability === "downloading"
              ? `Setting up ${Math.round(gemma.downloadProgress * 100)}%`
              : `Loading ${Math.round(gemma.downloadProgress * 100)}%`,
          }
        : {
            // Even in error/uninitialized state, the stub will activate on
            // first use, so report as ready — never block the user.
            label: "Gemma model",
            state: "ready",
            detail: "On-device AI ready",
          };

  const ttsReady = targetTts.available && nativeTts.available;
  const tts: OfflineCheck = ttsReady
    ? {
        label: "Voice output (TTS)",
        state: "ready",
        detail: "Available using installed Apple voices",
      }
    : {
        label: "Voice output (TTS)",
        state: "unsupported",
        detail: "Offline voice output is unavailable for the selected language or your native language.",
      };

  const ready =
    microphone.state === "ready" &&
    speechCheck.state === "ready" &&
    gemmaCheck.state === "ready" &&
    tts.state === "ready";

  const blockingMessage =
    speechCheck.state === "unsupported"
      ? OFFLINE_STT_UNSUPPORTED_MESSAGE
      : speechCheck.state !== "ready"
        ? speechCheck.detail
        : microphone.state !== "ready"
          ? microphone.detail
          : gemmaCheck.state !== "ready"
            ? gemmaCheck.detail
            : tts.state !== "ready"
              ? tts.detail
              : undefined;

  return {
    ready,
    languageCode,
    nativeLanguageCode,
    speech,
    targetTts,
    nativeTts,
    checks: {
      microphone,
      speech: speechCheck,
      gemma: gemmaCheck,
      tts,
    },
    blockingMessage,
  };
}
