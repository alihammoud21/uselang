// ── Sound Manager ────────────────────────────────────────────────────────────
// Duolingo-style audio: real synthesized tones via expo-av WAV generation.
// Each event plays a distinct chime/buzz. One sound at a time.

import { Audio } from "expo-av";

export type SoundEvent =
  | "prompt"
  | "submit"
  | "correct"
  | "wrong"
  | "error-grammar"
  | "error-tone"
  | "error-pronunciation"
  | "error-word-choice"
  | "error-structure"
  | "correction"
  | "success-step"
  | "mastery"
  | "speak-start"
  | "speak-end"
  | "ai-ready"
  | "exam-start"
  | "exam-pass"
  | "exam-fail"
  | "xp-gain"
  | "streak"
  | "level-up"
  | "tap";

// ── Haptic types ─────────────────────────────────────────────────────────────

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "none";

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {}

function triggerHaptic(style: HapticStyle): void {
  if (!Haptics) return;
  try {
    switch (style) {
      case "light":   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case "medium":  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case "heavy":   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case "success": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case "warning": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
      case "error":   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  } catch {}
}

const HAPTIC_MAP: Record<SoundEvent, HapticStyle> = {
  prompt: "none",
  submit: "light",
  correct: "success",
  wrong: "error",
  "error-grammar": "warning",
  "error-tone": "warning",
  "error-pronunciation": "warning",
  "error-word-choice": "warning",
  "error-structure": "warning",
  correction: "none",
  "success-step": "medium",
  mastery: "success",
  "speak-start": "light",
  "speak-end": "light",
  "ai-ready": "none",
  "exam-start": "medium",
  "exam-pass": "success",
  "exam-fail": "warning",
  "xp-gain": "light",
  streak: "medium",
  "level-up": "heavy",
  tap: "light",
};

// ── WAV synthesis ────────────────────────────────────────────────────────────

const SAMPLE_RATE = 22050;

interface ToneNote { freq: number; ms: number; vol: number; }

function generateWav(notes: ToneNote[]): string {
  let totalSamples = 0;
  for (const n of notes) totalSamples += Math.floor(SAMPLE_RATE * n.ms / 1000);

  const dataSize = totalSamples * 2;
  const buffer = new Uint8Array(44 + dataSize);

  const writeStr = (off: number, str: string) => { for (let i = 0; i < str.length; i++) buffer[off + i] = str.charCodeAt(i); };
  const write32 = (off: number, val: number) => { buffer[off] = val & 0xff; buffer[off+1] = (val >> 8) & 0xff; buffer[off+2] = (val >> 16) & 0xff; buffer[off+3] = (val >> 24) & 0xff; };
  const write16 = (off: number, val: number) => { buffer[off] = val & 0xff; buffer[off+1] = (val >> 8) & 0xff; };

  writeStr(0, "RIFF");
  write32(4, 36 + dataSize);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  write32(16, 16);
  write16(20, 1);
  write16(22, 1);
  write32(24, SAMPLE_RATE);
  write32(28, SAMPLE_RATE * 2);
  write16(32, 2);
  write16(34, 16);
  writeStr(36, "data");
  write32(40, dataSize);

  let offset = 44;
  for (const note of notes) {
    const nSamples = Math.floor(SAMPLE_RATE * note.ms / 1000);
    const fadeLen = Math.min(Math.floor(nSamples * 0.15), 400);
    for (let i = 0; i < nSamples; i++) {
      let amp = Math.sin(2 * Math.PI * note.freq * i / SAMPLE_RATE) * note.vol;
      // Fade in/out to avoid clicks
      if (i < fadeLen) amp *= i / fadeLen;
      else if (i > nSamples - fadeLen) amp *= (nSamples - i) / fadeLen;
      const sample = Math.max(-32768, Math.min(32767, Math.round(amp * 32767)));
      buffer[offset] = sample & 0xff;
      buffer[offset + 1] = (sample >> 8) & 0xff;
      offset += 2;
    }
  }

  // Convert to base64
  let binary = "";
  for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
  return btoa(binary);
}

// ── Sound definitions (Duolingo-inspired) ────────────────────────────────────

const SOUNDS: Record<SoundEvent, ToneNote[]> = {
  // Correct — happy ascending ding-ding
  correct:        [{ freq: 880, ms: 80, vol: 0.5 }, { freq: 1109, ms: 80, vol: 0.5 }, { freq: 1318, ms: 140, vol: 0.6 }],
  "success-step": [{ freq: 880, ms: 80, vol: 0.5 }, { freq: 1109, ms: 80, vol: 0.5 }, { freq: 1318, ms: 140, vol: 0.6 }],

  // Wrong — descending buzz
  wrong:          [{ freq: 330, ms: 120, vol: 0.4 }, { freq: 260, ms: 200, vol: 0.35 }],
  "error-grammar":     [{ freq: 350, ms: 100, vol: 0.3 }, { freq: 280, ms: 160, vol: 0.3 }],
  "error-tone":        [{ freq: 300, ms: 80, vol: 0.3 }, { freq: 380, ms: 80, vol: 0.3 }, { freq: 260, ms: 120, vol: 0.3 }],
  "error-pronunciation":[{ freq: 380, ms: 70, vol: 0.3 }, { freq: 300, ms: 120, vol: 0.3 }],
  "error-word-choice":  [{ freq: 320, ms: 100, vol: 0.3 }, { freq: 260, ms: 150, vol: 0.3 }],
  "error-structure":    [{ freq: 300, ms: 100, vol: 0.3 }, { freq: 240, ms: 150, vol: 0.3 }],

  // Mastery / lesson complete — ascending fanfare
  mastery:    [{ freq: 523, ms: 90, vol: 0.6 }, { freq: 659, ms: 90, vol: 0.6 }, { freq: 784, ms: 90, vol: 0.6 }, { freq: 1047, ms: 250, vol: 0.7 }],
  "level-up": [{ freq: 440, ms: 80, vol: 0.5 }, { freq: 554, ms: 80, vol: 0.5 }, { freq: 659, ms: 80, vol: 0.5 }, { freq: 880, ms: 200, vol: 0.65 }],

  // XP gain — quick pop
  "xp-gain": [{ freq: 1200, ms: 50, vol: 0.4 }, { freq: 1500, ms: 70, vol: 0.45 }],
  streak:    [{ freq: 660, ms: 60, vol: 0.4 }, { freq: 880, ms: 60, vol: 0.4 }, { freq: 1100, ms: 100, vol: 0.5 }],

  // Prompt / submit — soft tonal cue
  prompt:     [{ freq: 660, ms: 80, vol: 0.25 }],
  submit:     [{ freq: 900, ms: 50, vol: 0.2 }],
  correction: [{ freq: 523, ms: 100, vol: 0.25 }],
  tap:        [{ freq: 1400, ms: 30, vol: 0.15 }],

  // Speak mode
  "speak-start": [{ freq: 523, ms: 60, vol: 0.3 }, { freq: 659, ms: 80, vol: 0.3 }],
  "speak-end":   [{ freq: 440, ms: 60, vol: 0.2 }],
  "ai-ready":    [{ freq: 600, ms: 60, vol: 0.2 }],

  // Exam
  "exam-start": [{ freq: 440, ms: 80, vol: 0.4 }, { freq: 554, ms: 80, vol: 0.4 }, { freq: 659, ms: 140, vol: 0.5 }],
  "exam-pass":  [{ freq: 523, ms: 80, vol: 0.6 }, { freq: 659, ms: 80, vol: 0.6 }, { freq: 784, ms: 80, vol: 0.6 }, { freq: 1047, ms: 300, vol: 0.7 }],
  "exam-fail":  [{ freq: 400, ms: 150, vol: 0.35 }, { freq: 300, ms: 250, vol: 0.3 }],
};

// ── Pre-generated WAV cache ──────────────────────────────────────────────────

const wavCache: Partial<Record<SoundEvent, string>> = {};

function getWavBase64(event: SoundEvent): string {
  if (!wavCache[event]) {
    wavCache[event] = generateWav(SOUNDS[event] || SOUNDS.tap);
  }
  return wavCache[event]!;
}

// ── State ────────────────────────────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;
let enabled = true;
let audioReady = false;

async function ensureAudio(): Promise<void> {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioReady = true;
  } catch {}
}

// ── Core API ─────────────────────────────────────────────────────────────────

export function setSoundEnabled(value: boolean): void { enabled = value; }
export function isSoundEnabled(): boolean { return enabled; }

export async function playSound(event: SoundEvent): Promise<void> {
  triggerHaptic(HAPTIC_MAP[event]);
  if (!enabled) return;

  await stopSound();
  await ensureAudio();

  try {
    const base64 = getWavBase64(event);
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${base64}` },
      { shouldPlay: true, volume: 1.0 },
    );
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if ("didJustFinish" in status && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) currentSound = null;
      }
    });
  } catch (e) {
    console.warn("[sound] playback error:", e);
  }
}

export async function stopSound(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export async function playLearnSound(event: Extract<SoundEvent,
  | "prompt" | "submit" | "correct" | "wrong"
  | "error-grammar" | "error-tone" | "error-pronunciation"
  | "error-word-choice" | "error-structure"
  | "correction" | "success-step" | "mastery"
>): Promise<void> {
  return playSound(event);
}

export async function playSpeakSound(event: Extract<SoundEvent,
  | "speak-start" | "speak-end" | "ai-ready"
  | "exam-start" | "exam-pass" | "exam-fail"
>): Promise<void> {
  return playSound(event);
}

export async function playGameSound(event: Extract<SoundEvent,
  | "xp-gain" | "streak" | "level-up"
>): Promise<void> {
  return playSound(event);
}

export function errorCategoryToSound(category: string): SoundEvent {
  switch (category) {
    case "grammar": return "error-grammar";
    case "pronunciation": return "error-pronunciation";
    case "tone": return "error-tone";
    case "word-choice": return "error-word-choice";
    case "structure": return "error-structure";
    default: return "wrong";
  }
}
