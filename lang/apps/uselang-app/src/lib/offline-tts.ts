import { NativeModules, Platform } from "react-native";
import * as Speech from "expo-speech";
import { SUPPORTED_LANGUAGES } from "./constants";

type NativeOfflineVoiceModule = {
  getTtsStatus?: (locale: string) => Promise<NativeTtsStatus>;
  speak?: (text: string, locale: string, rate: number) => Promise<void>;
  stopSpeaking?: () => Promise<void>;
};

export interface NativeTtsStatus {
  available: boolean;
  locale: string;
  voiceIdentifier?: string;
  voiceName?: string;
  voiceLanguage?: string;
  voiceCount?: number;
}

function getNativeModule(): NativeOfflineVoiceModule | null {
  return Platform.OS === "ios"
    ? ((NativeModules as any).OfflineVoiceModule as NativeOfflineVoiceModule | undefined) ?? null
    : null;
}

export function ttsLocaleFor(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code || l.locale === code || l.sttCode === code);
  return lang?.locale || (code.includes("-") ? code : `${code}-US`);
}

// ── Pre-warm ──────────────────────────────────────────────────────────────
// Apple's TTS engine has a cold-start penalty the first time a locale is
// used: it loads the voice model, which takes 1-3s on simulator and ~0.5s
// on device. We eliminate this by speaking an inaudible utterance at app
// launch so the voice is already resident when the tutor needs it.
const warmedLocales = new Set<string>();

export function prewarmOfflineTts(languageCode: string): void {
  const locale = ttsLocaleFor(languageCode);
  if (warmedLocales.has(locale)) return;
  warmedLocales.add(locale);

  // A single space triggers the engine init without audible output.
  // expo-speech will load the voice pack and keep it warm in memory.
  console.log(`[offline-tts] Pre-warming voice for ${locale}`);
  Speech.speak(" ", {
    language: locale,
    rate: 2,      // fastest possible — finishes instantly
    volume: 0,    // silent
    pitch: 1,
  });
}

export async function getOfflineTtsStatus(languageCode: string): Promise<NativeTtsStatus> {
  const locale = ttsLocaleFor(languageCode);
  const native = getNativeModule();
  if (native?.getTtsStatus) {
    return native.getTtsStatus(locale);
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const base = locale.split("-")[0];
    const voice = voices.find((v) => v.language === locale) || voices.find((v) => v.language?.startsWith(`${base}-`));
    return {
      available: !!voice,
      locale,
      voiceIdentifier: voice?.identifier,
      voiceName: voice?.name,
      voiceLanguage: voice?.language,
      voiceCount: voices.length,
    };
  } catch {
    return { available: false, locale, voiceCount: 0 };
  }
}

export async function speakOfflineText({
  text,
  languageCode,
  rate = 1,
}: {
  text: string;
  languageCode: string;
  rate?: number;
}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  const locale = ttsLocaleFor(languageCode);
  const native = getNativeModule();

  // Slower-than-default baseline. expo-speech defaults to 1.0 (which is
  // already too fast for coaching), and the previous 0.9 multiplier still
  // sounded rapid-fire. 0.78 gives the offline voice a clear, paced
  // delivery — closer to how a tutor would actually say it. The
  // user-supplied `rate` param still scales on top of this baseline so the
  // voice-speed setting on the Lesson screen keeps working.
  const PACED_BASELINE = 0.78;
  const safeRate = Math.max(0.5, Math.min(2, rate));

  // Split into sentence-sized chunks so we can insert short pauses
  // between them. Without these pauses the voice runs every period, comma,
  // and question mark together as one wall of text. Pause length is tied
  // to the punctuation: full stop / question / exclamation get a longer
  // breath, commas/colons get a shorter one.
  const chunks = splitForPacing(clean);

  for (const chunk of chunks) {
    const body = chunk.text.trim();
    if (!body) continue;

    if (native?.speak) {
      await native.speak(body, locale, PACED_BASELINE * safeRate);
    } else {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          resolve();
        };
        const timeout = setTimeout(() => {
          Speech.stop();
          finish();
        }, estimatedSpeechMs(body, safeRate * PACED_BASELINE));
        Speech.speak(body, {
          language: locale,
          rate: PACED_BASELINE * safeRate,
          onDone: finish,
          onStopped: finish,
          onError: finish,
        });
      });
    }
    if (chunk.pauseMs > 0) {
      await new Promise<void>((r) => setTimeout(r, chunk.pauseMs));
    }
  }
}

// Cut the input into sentence-or-phrase chunks and decide how long to wait
// after each. Keeps quoted phrases together so we never break a foreign
// phrase across a TTS handoff.
function splitForPacing(text: string): { text: string; pauseMs: number }[] {
  const out: { text: string; pauseMs: number }[] = [];
  // Match runs of non-terminator chars + a terminator. Keeps quotes whole.
  const re = /[^.!?,;:\n]+(?:[.!?,;:]+|\n+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const piece = m[0];
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const last = trimmed.slice(-1);
    let pauseMs = 0;
    if (".!?".includes(last)) pauseMs = 320;
    else if (last === ":") pauseMs = 220;
    else if (",;".includes(last)) pauseMs = 160;
    out.push({ text: trimmed, pauseMs });
  }
  // No terminators? push the whole thing with a small trailing pause.
  if (out.length === 0) out.push({ text: text.trim(), pauseMs: 120 });
  // Last chunk doesn't need a long trailing pause — collapse to 0.
  if (out.length > 0) out[out.length - 1].pauseMs = 0;
  return out;
}

export async function stopOfflineTts(): Promise<void> {
  try {
    const native = getNativeModule();
    await native?.stopSpeaking?.().catch(() => {});
  } catch { /* swallow native stop failures */ }
  try {
    Speech.stop();
  } catch { /* swallow expo-speech stop failures */ }
}

function estimatedSpeechMs(text: string, rate: number): number {
  const multiplier = Math.max(0.5, Math.min(2, rate));
  return Math.min(16000, Math.max(1800, Math.ceil((text.length * 82) / multiplier)));
}
