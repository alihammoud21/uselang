// ── Tutor audio playback ─────────────────────────────────────────────────────
// Plays tutor response audio. Routes through the TTS router which dynamically
// picks Deepgram (online) or native device voices (offline) per-request.
// No forced-offline flags — connectivity is checked on every TTS call.

import { Audio } from "expo-av";
import type { TutorAudioSegment } from "./tutor-api";
import { speakOfflineText, stopOfflineTts } from "./offline-tts";
import { speakRoutedText, stopRoutedTts } from "./tts-router";

let currentSound: Audio.Sound | null = null;
let audioSessionReady = false;

// Module-level playback rate (0.5–2.0). 1.0 = natural speed. The Speak tab's
// voice-speed control writes to this so every subsequent tutor audio / offline
// TTS call inherits the chosen tempo without threading the setting through
// every call site.
let currentRate = 1.0;

export function setTutorPlaybackRate(rate: number): void {
  // Clamp to what expo-av + expo-speech both support reliably.
  currentRate = Math.max(0.5, Math.min(2.0, rate));
  if (currentSound) {
    // Apply immediately if something is actively playing.
    currentSound
      .setRateAsync(currentRate, /* shouldCorrectPitch */ true)
      .catch(() => {});
  }
}

export function getTutorPlaybackRate(): number {
  return currentRate;
}

async function prepareAudioSession(): Promise<void> {
  if (audioSessionReady) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioSessionReady = true;
}

export interface PlayOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: Error) => void;
  /** Override the current playback rate just for this call. */
  rate?: number;
  /**
   * Fires before each transcript segment starts playing. Used by the Quick
   * Session screen to update the live transcript in time with the audio.
   * Index is 0-based.
   */
  onSegmentStart?: (segment: TutorAudioSegment, index: number) => void;
}

/**
 * Play tutor audio. Prefers backend base64 blob; falls back to device TTS.
 */
export async function playTutorAudio(
  {
    audioBase64,
    audioMimeType = "audio/mpeg",
    audioSegments,
    fallbackText,
    languageCode,
    nativeLanguageCode: _nativeLanguageCode,
    offlineOnly: _offlineOnly = false,
  }: {
    audioBase64?: string | null;
    audioMimeType?: string;
    audioSegments?: TutorAudioSegment[];
    fallbackText: string;
    languageCode: string;
    nativeLanguageCode?: string;
    /** @deprecated Ignored. TTS routing is now dynamic per-request. */
    offlineOnly?: boolean;
  },
  { onStart, onEnd, onError, rate, onSegmentStart }: PlayOptions = {}
): Promise<void> {
  void _offlineOnly; // ignored — routing is always dynamic
  await stopTutorAudio();
  await prepareAudioSession();
  const effectiveRate = rate ?? currentRate;
  const safeFallbackText = typeof fallbackText === "string" ? fallbackText.trim() : "";

  if (audioBase64 && audioBase64.length > 100) {
    try {
      onStart?.();
      const uri = `data:${audioMimeType};base64,${audioBase64}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          rate: effectiveRate,
          shouldCorrectPitch: true,
        }
      );
      currentSound = sound;
      // Drive the live transcript using a time-proportional reveal of the
      // segment list — backend audio is one stitched MP3, so we don't get
      // per-segment callbacks from CoreAudio. Approximation by char-length
      // is good enough for a coaching transcript.
      if (audioSegments?.length && onSegmentStart) {
        scheduleSegmentReveal(audioSegments, onSegmentStart);
      } else if (audioSegments?.length === undefined && onSegmentStart) {
        onSegmentStart({ lang: languageCode, text: safeFallbackText }, 0);
      }
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          currentSound = null;
          cancelSegmentReveal();
          onEnd?.();
        }
      });
      return;
    } catch (err) {
      console.warn("[tutor-audio] Backend audio failed, using device speech fallback.", err);
      // fall through to offline path
    }
  }

  if (audioSegments?.length) {
    onStart?.();
    try {
      await speakSegmentsOffline(audioSegments, effectiveRate, onSegmentStart);
      onEnd?.();
    } catch (err) {
      onError?.(err as Error);
      speakOffline(safeFallbackText, languageCode, onEnd, effectiveRate);
    }
    return;
  }

  // Text-to-speech path — routes dynamically through the TTS router.
  if (!safeFallbackText) {
    onEnd?.();
    return;
  }
  onStart?.();
  if (onSegmentStart) {
    onSegmentStart({ lang: languageCode, text: safeFallbackText }, 0);
  }
  speakRouted(safeFallbackText, languageCode, onEnd, effectiveRate);
}

async function speakSegmentsOffline(
  segments: TutorAudioSegment[],
  rate: number | undefined,
  onSegmentStart?: (segment: TutorAudioSegment, index: number) => void,
): Promise<void> {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const text = segment.text.trim();
    if (!text) continue;
    onSegmentStart?.(segment, i);
    // Route through the TTS picker: online + Deepgram-supported lang →
    // Deepgram cloud voice. Otherwise (offline or non-English target) →
    // native iOS speech via expo-speech / OfflineVoiceModule. The router
    // makes that decision per call so a mid-session network drop just
    // moves the next utterance back to the device voice.
    try {
      await speakRoutedText({
        text,
        languageCode: segment.lang,
        rate: rate ?? currentRate,
      });
    } catch (segErr) {
      console.warn(`[tutor-audio] segment ${i} failed, continuing:`, (segErr as Error)?.message);
    }
  }
}

// ── Segment reveal scheduler (cloud-audio path) ─────────────────────────────
// One stitched MP3 means we don't get per-chunk timing from CoreAudio, so we
// approximate: each segment gets a slice of the total proportional to its
// char-length, with a small minimum so single-character target words don't
// flash by. Reset on stop.
let segmentRevealTimers: ReturnType<typeof setTimeout>[] = [];

function scheduleSegmentReveal(
  segments: TutorAudioSegment[],
  onSegmentStart: (segment: TutorAudioSegment, index: number) => void,
): void {
  cancelSegmentReveal();
  // Heuristic: ~14 chars per second of speech at the default rate. Slow
  // enough that the transcript follows comfortably without lagging behind.
  const CHARS_PER_SECOND = 14;
  const MIN_SEGMENT_MS = 350;
  let elapsedMs = 0;
  segments.forEach((seg, i) => {
    segmentRevealTimers.push(
      setTimeout(() => onSegmentStart(seg, i), elapsedMs),
    );
    const len = (seg.text || "").trim().length;
    const ms = Math.max(MIN_SEGMENT_MS, (len / CHARS_PER_SECOND) * 1000);
    elapsedMs += ms;
  });
}

function cancelSegmentReveal(): void {
  segmentRevealTimers.forEach((t) => clearTimeout(t));
  segmentRevealTimers = [];
}

/**
 * Speak via the TTS router (Deepgram online, native offline). Fire-and-forget.
 */
function speakRouted(
  text: string,
  languageCode: string,
  onEnd?: () => void,
  rate?: number
): void {
  const speechText = typeof text === "string" ? text.trim() : "";
  if (!speechText) {
    onEnd?.();
    return;
  }
  const effective = rate ?? currentRate;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd?.();
  };
  speakRoutedText({
    text: speechText,
    languageCode,
    rate: effective,
  })
    .then(finish)
    .catch(finish);
}

export function speakOffline(
  text: string,
  languageCode: string,
  onEnd?: () => void,
  rate?: number
): void {
  const speechText = typeof text === "string" ? text.trim() : "";
  if (!speechText) {
    onEnd?.();
    return;
  }
  // expo-speech's rate baseline is ~0.9 for natural pacing on most devices.
  // We scale the user's chosen multiplier against that baseline.
  const baseRate = 0.9;
  const effective = baseRate * (rate ?? currentRate);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd?.();
  };
  speakOfflineText({
    text: speechText,
    languageCode,
    rate: effective / baseRate,
  })
    .then(finish)
    .catch(finish);
}

export async function stopTutorAudio(): Promise<void> {
  cancelSegmentReveal();
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch { /* ignore */ }
    currentSound = null;
  }
  // Cover all three handles: native, expo-av (legacy backend audio), and
  // the Deepgram-routed sound. Without `stopRoutedTts` the orb tap couldn't
  // interrupt a Deepgram clip mid-utterance.
  await stopRoutedTts();
  await stopOfflineTts();
}

/**
 * Play a user-recorded audio file by URI. Used for the "Hear your take" pill
 * on the tutor response card. Shares the same Sound handle as the tutor
 * audio so we never overlap playback.
 */
export async function playUserAudio(
  uri: string,
  { onStart, onEnd, onError }: PlayOptions = {}
): Promise<void> {
  await stopTutorAudio();
  await prepareAudioSession();
  try {
    onStart?.();
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        onEnd?.();
        sound.unloadAsync().catch(() => {});
        currentSound = null;
      }
    });
  } catch (err) {
    onError?.(err as Error);
    onEnd?.();
  }
}
