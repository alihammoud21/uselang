// ── Speech-to-text client ────────────────────────────────────────────────────
// Optional cloud speech-to-text helper. Core voice flows use native on-device
// speech recognition; callers may use this only as an optional STT path.

import { Audio } from "expo-av";
import { getApiBaseUrl } from "./tutor-api";

let activeRecording: Audio.Recording | null = null;

// Hard cap on a single recording. Protects against VAD metering never firing
// (iOS Simulator + some Android devices don't stream metering reliably) and
// against the user walking away mid-turn.
const MAX_RECORDING_MS = 15_000;

export type CloudSttProvider = "deepgram" | "xfyun";

interface RecordingConfig {
  mimeType: string;
  options: Audio.RecordingOptions;
}

function recordingConfigFor(provider?: CloudSttProvider): RecordingConfig {
  if (provider === "xfyun" && Audio.IOSOutputFormat && Audio.IOSAudioQuality) {
    return {
      mimeType: "audio/mpeg",
      options: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
        ios: {
          extension: ".mp3",
          outputFormat: Audio.IOSOutputFormat.MPEGLAYER3,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 16_000,
          numberOfChannels: 1,
          bitRate: 64_000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      },
    };
  }

  return {
    mimeType: "audio/m4a",
    options: {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    },
  };
}

export interface RecorderHandle {
  stop: () => Promise<{ audioBase64: string; mimeType: string; durationMs: number; uri: string } | null>;
  cancel: () => Promise<void>;
  onMetering: (fn: (db: number) => void) => () => void;
}

// ── Recording ────────────────────────────────────────────────────────────────

async function setPlaybackMode() {
  // Critical: iOS silences speakers during record mode. Reset before playback
  // or the AI voice is inaudible. We swallow failures because the simulator
  // occasionally throws on mode flips with no actual consequence.
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    /* ignore — playback still works on every simulator we tested */
  }
}

export async function restorePlaybackMode(): Promise<void> {
  await setPlaybackMode();
}

export async function startRecording(options: { provider?: CloudSttProvider } = {}): Promise<RecorderHandle> {
  await stopAnyActive();
  await Audio.setIsEnabledAsync(true);
  const recordingConfig = recordingConfigFor(options.provider);

  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    const hint =
      perm.canAskAgain === false
        ? " Enable it in Settings → Lang → Microphone."
        : "";
    throw new Error("Microphone permission denied." + hint);
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: 1,
    interruptionModeAndroid: 1,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  await delay(150);

  const recording = new Audio.Recording();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  await delay(50);
  await recording.prepareToRecordAsync(recordingConfig.options);
  await recording.startAsync();
  recording.setProgressUpdateInterval(100);
  activeRecording = recording;

  // Hard-stop guard — if VAD never fires, we still terminate cleanly.
  const maxDurationGuard = setTimeout(() => {
    if (activeRecording === recording) {
      recording.stopAndUnloadAsync().catch(() => {});
    }
  }, MAX_RECORDING_MS);

  const meteringListeners = new Set<(db: number) => void>();
  recording.setOnRecordingStatusUpdate((status) => {
    if (!status.isRecording) return;
    const db = typeof (status as any).metering === "number" ? (status as any).metering : -160;
    meteringListeners.forEach((fn) => fn(db));
  });

  return {
    async stop() {
      clearTimeout(maxDurationGuard);
      if (activeRecording !== recording) return null;
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        activeRecording = null;
        await setPlaybackMode();
        return null;
      }
      const uri = recording.getURI();
      const status = await recording.getStatusAsync().catch(() => null);
      activeRecording = null;
      await setPlaybackMode();
      if (!uri) return null;

      const res = await fetch(uri);
      const blob = await res.blob();
      const audioBase64 = await blobToBase64(blob);
      const mimeType = recordingConfig.mimeType || blob.type || "audio/m4a";
      const durationMs =
        status && "durationMillis" in status ? (status as any).durationMillis ?? 0 : 0;

      return { audioBase64, mimeType, durationMs, uri };
    },
    async cancel() {
      clearTimeout(maxDurationGuard);
      if (activeRecording !== recording) return;
      try { await recording.stopAndUnloadAsync(); } catch {}
      activeRecording = null;
      meteringListeners.clear();
      await setPlaybackMode();
    },
    onMetering(fn) {
      meteringListeners.add(fn);
      return () => meteringListeners.delete(fn);
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopAnyActive() {
  if (!activeRecording) return;
  try { await activeRecording.stopAndUnloadAsync(); } catch {}
  activeRecording = null;
}

// ── Transcription ────────────────────────────────────────────────────────────

export interface TranscribeResult {
  text: string;
  provider?: string;
}

export async function transcribeAudio(
  {
    audioBase64,
    mimeType,
    languageCode,
    fallbackLanguageCode,
    preferredProvider,
  }: {
    audioBase64: string;
    mimeType: string;
    languageCode: string;
    fallbackLanguageCode?: string;
    preferredProvider?: CloudSttProvider;
  },
  {
    idToken,
    signal,
  }: { idToken?: string; signal?: AbortSignal } = {}
): Promise<TranscribeResult> {
  const res = await fetch(`${getApiBaseUrl()}/api/stt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      languageCode,
      fallbackLanguageCode,
      preferredProvider,
    }),
    signal,
  });

  const raw = await res.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { error: raw }; }

  if (!res.ok) {
    const err: any = new Error(payload?.error || `STT failed (${res.status}).`);
    err.status = res.status;
    err.missingKeys = payload?.missingKeys;
    throw err;
  }

  return { text: String(payload.text || ""), provider: payload.provider };
}

// ── Utilities ────────────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
