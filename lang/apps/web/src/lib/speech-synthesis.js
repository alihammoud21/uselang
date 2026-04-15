const LANG_LOCALE = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  nl: 'nl-NL',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
  pt: 'pt-BR',
  ko: 'ko-KR',
  ru: 'ru-RU',
  pl: 'pl-PL',
  tr: 'tr-TR',
}

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function getLocale(langCode) {
  return LANG_LOCALE[langCode] ?? 'en-US'
}

export function isOfflineTtsAvailable() {
  return supported
}

/** Return voices for a given UseLang language code. */
export function getVoicesForLang(langCode) {
  if (!supported) return []
  const prefix = getLocale(langCode).split('-')[0]
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith(prefix))
}

/**
 * Wait for voices to load (Chrome loads them async).
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function loadVoices() {
  return new Promise((resolve) => {
    if (!supported) { resolve([]); return }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) { resolve(voices); return }
    window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices())
  })
}

/**
 * Speak text using Web Speech TTS.
 * @param {string} text
 * @param {string} [langCode]
 * @param {number} [rate]
 * @param {{ pitch?: number; volume?: number; voiceURI?: string; onEnd?: () => void; onError?: (e: Event) => void }} [opts]
 * @returns {{ cancel: () => void }}
 */
export function speakOffline(text, langCode = 'en', rate = 0.88, opts = {}) {
  if (!supported || !text?.trim()) return { cancel: () => {} }
  window.speechSynthesis.cancel()

  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = getLocale(langCode)
  utt.rate = rate
  utt.pitch = opts.pitch ?? 1.0
  utt.volume = opts.volume ?? 1.0

  if (opts.voiceURI) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === opts.voiceURI)
    if (voice) utt.voice = voice
  } else {
    const voices = getVoicesForLang(langCode)
    const local = voices.find((v) => v.localService) ?? voices[0]
    if (local) utt.voice = local
  }

  if (opts.onEnd) utt.onend = opts.onEnd
  if (opts.onError) utt.onerror = opts.onError

  window.speechSynthesis.speak(utt)
  return { cancel: stopOfflineSpeech }
}

export function stopOfflineSpeech() {
  if (supported) window.speechSynthesis.cancel()
}

export function pauseSpeech() {
  if (supported) window.speechSynthesis.pause()
}

export function resumeSpeech() {
  if (supported) window.speechSynthesis.resume()
}

export function isSpeaking() {
  return supported && window.speechSynthesis.speaking
}
