// ── TTS router ─────────────────────────────────────────────────────────────
// Plays text aloud using the best available voice for the user's current
// network state.
//
//   ONLINE  + Deepgram key present → Deepgram cloud TTS (premium, natural)
//   OFFLINE / no key / Deepgram fails → native iOS speech (works in China)
//
// Hard rules:
//   • No fake fallback. If Deepgram is unreachable we DON'T silently retry —
//     we log a single warning and use native immediately.
//   • Never block the UI for more than ~1.5s while probing connectivity. The
//     last-known-online state is cached for 30s so back-to-back utterances
//     don't re-probe.
//   • The native fallback already supports zh-CN / ja-JP / etc. via Apple's
//     installed voices, so the China case Just Works without Deepgram.

import { Audio } from "expo-av";
import { isOnline } from "./connectivity";
import { speakOfflineText, stopOfflineTts } from "./offline-tts";

const DEEPGRAM_TTS_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_TTS_API_KEY || "";
if (!DEEPGRAM_TTS_KEY) {
  console.warn("[tts-router] EXPO_PUBLIC_DEEPGRAM_TTS_API_KEY is not set — all TTS will use native voices. Add your Deepgram API key to .env to enable premium voices.");
}

// ── Per-language voice mapping ────────────────────────────────────────────
// Deepgram Aura voices for supported languages. Mandarin (zh) has no Aura
// voice — it uses Apple's native zh-CN TTS which works great offline.

const DEEPGRAM_VOICES: Record<string, string> = {
  en: "aura-asteria-en",
  "en-US": "aura-asteria-en",
  "en-GB": "aura-asteria-en",
  fr: "aura-2-agathe-fr",
  "fr-FR": "aura-2-agathe-fr",
  "fr-CA": "aura-2-agathe-fr",
  // luna-es is female, warm, and clear — much less deep than sirio-es (male)
  es: "aura-2-luna-es",
  "es-ES": "aura-2-luna-es",
  "es-MX": "aura-2-luna-es",
  "es-419": "aura-2-luna-es",
  de: "aura-2-hector-de",
  "de-DE": "aura-2-hector-de",
};

function deepgramVoiceFor(lang: string): string | null {
  return DEEPGRAM_VOICES[lang] || DEEPGRAM_VOICES[lang.slice(0, 2)] || null;
}

// ── Online detection cache ────────────────────────────────────────────────
// We cache the last-known online state for 30s. Probing on every TTS call
// adds 200-500ms of latency to the user's first-word-heard time, which
// makes the tutor feel sluggish. 30s is short enough that recovering from
// a brief network drop happens within one or two utterances.

let onlineCache: { ts: number; online: boolean } | null = null;
const ONLINE_CACHE_MS = 5_000; // 5s — short enough to recover quickly from network changes

async function isOnlineCached(): Promise<boolean> {
  const now = Date.now();
  if (onlineCache && now - onlineCache.ts < ONLINE_CACHE_MS) {
    return onlineCache.online;
  }
  const online = await isOnline();
  onlineCache = { ts: now, online };
  return online;
}

/**
 * Force the TTS router to re-probe connectivity on the next call. Useful
 * after the user toggles airplane mode or switches networks. The
 * `useOnlineStatus` hook can call this when its hysteresis flips.
 */
export function invalidateTtsConnectivityCache(): void {
  onlineCache = null;
}

// ── Playback handle ───────────────────────────────────────────────────────

let currentDeepgramSound: Audio.Sound | null = null;

export async function stopRoutedTts(): Promise<void> {
  if (currentDeepgramSound) {
    try {
      await currentDeepgramSound.stopAsync();
      await currentDeepgramSound.unloadAsync();
    } catch {
      /* swallow */
    }
    currentDeepgramSound = null;
  }
  try {
    await stopOfflineTts();
  } catch {
    /* swallow — stop failures must never propagate */
  }
}

export interface RoutedTtsOptions {
  text: string;
  languageCode: string;
  /** Defaults to 1.0. Clamped to [0.5, 2.0]. */
  rate?: number;
  /** Force a specific provider. Useful for tests + Settings panel toggles. */
  provider?: "auto" | "deepgram" | "native";
}

/**
 * Speak `text` aloud using the best available provider. Returns when the
 * audio has finished or failed.
 *
 * Provider logic:
 *   - "deepgram": only when online + key present + voice available for lang
 *   - "native":   always; uses installed iOS voices via expo-speech
 *   - "auto":     prefer Deepgram, fall through to native cleanly
 */
export async function speakRoutedText(opts: RoutedTtsOptions): Promise<void> {
  const text = opts.text.trim();
  if (!text) return;
  const provider = opts.provider || "auto";
  const rate = Math.max(0.5, Math.min(2, opts.rate ?? 1));

  // Fast-path: explicit native, or no Deepgram voice for this language.
  if (provider === "native") {
    console.log("[tts-router] USING: Offline TTS (explicit native)");
    return speakOfflineText({ text, languageCode: opts.languageCode, rate });
  }
  const voice = deepgramVoiceFor(opts.languageCode);
  if (provider === "auto" && (!voice || !DEEPGRAM_TTS_KEY)) {
    console.log(`[tts-router] USING: Offline TTS (no Deepgram voice for ${opts.languageCode} or no key)`);
    return speakOfflineText({ text, languageCode: opts.languageCode, rate });
  }

  // Probe connectivity for auto. Skip the probe when explicitly forced
  // to deepgram — caller has accepted the risk of failure.
  if (provider !== "deepgram" && !(await isOnlineCached())) {
    console.log("[tts-router] USING: Offline TTS (network check: offline)");
    return speakOfflineText({ text, languageCode: opts.languageCode, rate });
  }

  // ── Cloud path ──────────────────────────────────────────────────────────
  const deepgramVoice = voice || "aura-asteria-en";
  console.log(`[tts-router] USING: Deepgram TTS (voice: ${deepgramVoice})`);
  try {
    await playDeepgramTts(text, deepgramVoice, rate);
  } catch (err) {
    // No retry — fall through to native TTS immediately for speed.
    // Mark offline so the next call doesn't re-probe for a few seconds.
    console.warn("[tts-router] Deepgram failed, using native TTS:", (err as Error)?.message);
    onlineCache = { ts: Date.now(), online: false };
    await speakOfflineText({ text, languageCode: opts.languageCode, rate });
  }
}

// ── Deepgram TTS player ────────────────────────────────────────────────────
// Uses Deepgram's REST endpoint that streams MP3-encoded audio. We download
// the full clip first (a sentence is small, < 50KB typically), then play it
// with expo-av. Streaming-while-playing would be nicer but expo-av doesn't
// support partial-buffer playback without extra plumbing — and a sentence
// finishes downloading in ~200ms on a normal connection, which is below
// the user's perception threshold for "instant".

const MAX_TTS_BYTES = 512_000; // 500KB — reject anything larger to avoid OOM

// ── In-memory TTS audio cache (LRU, ~10 entries) ──────────────────────
// Avoids re-fetching the same phrase from Deepgram on replays.
const TTS_CACHE_MAX = 10;
const ttsCache = new Map<string, string>(); // key → base64 data URI
function ttsCacheKey(text: string, voice: string): string {
  return `${voice}:${text.slice(0, 200)}`;
}
function ttsCacheSet(key: string, uri: string): void {
  if (ttsCache.size >= TTS_CACHE_MAX) {
    const oldest = ttsCache.keys().next().value;
    if (oldest !== undefined) ttsCache.delete(oldest);
  }
  ttsCache.set(key, uri);
}

// ── Fetch + cache Deepgram audio (shared by play and prefetch) ────────────
async function fetchDeepgramAudio(text: string, voice: string): Promise<string> {
  const cacheKey = ttsCacheKey(text, voice);
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    console.log(`[tts-router] cache HIT for "${text.slice(0, 30)}"`);
    return cached;
  }

  // 3s timeout — quick enough to feel fast, generous enough for typical mobile networks
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);

  let res: Response;
  try {
    res = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}&encoding=mp3`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_TTS_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      },
    );
  } catch (fetchErr: any) {
    clearTimeout(timeout);
    throw new Error(`deepgram_fetch: ${fetchErr?.message || "network error"}`);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`deepgram_${res.status}: ${errBody.slice(0, 200)}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_TTS_BYTES) {
    throw new Error(`deepgram_too_large: ${buf.byteLength} bytes`);
  }

  // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
  const bytes = new Uint8Array(buf);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  const base64 = globalThis.btoa(binary);
  const uri = `data:audio/mpeg;base64,${base64}`;
  ttsCacheSet(cacheKey, uri);
  console.log(`[tts-router] fetched + cached Deepgram audio (${buf.byteLength} bytes)`);
  return uri;
}

/**
 * Pre-warm the Deepgram TTS cache for a phrase so it plays instantly when
 * `speakRoutedText` is called. Fire-and-forget — errors are silently swallowed.
 * Ideal for pre-fetching a foreign phrase while the English intro is still playing.
 */
export function prefetchDeepgramTts(text: string, languageCode: string): void {
  if (!DEEPGRAM_TTS_KEY) return;
  const voice = deepgramVoiceFor(languageCode);
  if (!voice) return;
  isOnlineCached().then((online) => {
    if (!online) return;
    const cacheKey = ttsCacheKey(text, voice);
    if (ttsCache.has(cacheKey)) return; // already warm
    fetchDeepgramAudio(text, voice).catch(() => {
      // Prefetch failure is silent — speakRoutedText will fall back to native
    });
  }).catch(() => {});
}

async function playDeepgramTts(text: string, voice: string, rate: number): Promise<void> {
  const uri = await fetchDeepgramAudio(text, voice);

  await stopRoutedTts();
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, rate, shouldCorrectPitch: true },
  );
  currentDeepgramSound = sound;
  // Cap safety timeout proportional to text length, min 5s, max 15s
  const safetyMs = Math.max(5_000, Math.min(15_000, text.length * 120));
  await new Promise<void>((resolve) => {
    const safetyTimeout = setTimeout(() => {
      sound.unloadAsync().catch(() => {});
      if (currentDeepgramSound === sound) currentDeepgramSound = null;
      resolve();
    }, safetyMs);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        clearTimeout(safetyTimeout);
        sound.unloadAsync().catch(() => {});
        if (currentDeepgramSound === sound) currentDeepgramSound = null;
        resolve();
      }
    });
  });
}

// ── Diagnostics ───────────────────────────────────────────────────────────
// Surfaced in Settings → Voice. Tells the user which provider their TTS is
// currently routed to. Honest reporting keeps the China/offline contract
// transparent — no claim of "premium voice" when we're actually on Apple.

export type TtsProvider = "deepgram" | "native";

export async function currentTtsProvider(lang: string): Promise<TtsProvider> {
  if (!DEEPGRAM_TTS_KEY) return "native";
  if (!deepgramVoiceFor(lang)) return "native";
  if (!(await isOnlineCached())) return "native";
  return "deepgram";
}
