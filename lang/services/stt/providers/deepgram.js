import { assertEnv } from '../../shared/env.js'

export function validateDeepgramSttEnv(env = process.env) {
  assertEnv([env.DEEPGRAM_STT_API_KEY ? 'DEEPGRAM_STT_API_KEY' : 'DEEPGRAM_API_KEY'], env, 'Deepgram STT')
}

export function createDeepgramSttProvider(env = process.env) {
  validateDeepgramSttEnv(env)
  const apiKey = env.DEEPGRAM_STT_API_KEY || env.DEEPGRAM_API_KEY

  async function callDeepgram({ apiKey, audioBuffer, mimeType, languageCode }) {
    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=${encodeURIComponent(languageCode)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': mimeType,
        },
        body: audioBuffer,
      },
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.err_msg || 'Deepgram transcription failed.')
    }
    return {
      text: payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '',
      raw: payload,
    }
  }

  return {
    name: 'deepgram',
    async transcribe({ audioBuffer, mimeType, languageCode, fallbackLanguageCode }) {
      // First attempt: caller's preferred language (usually the target / learning lang).
      const first = await callDeepgram({
        apiKey,
        audioBuffer,
        mimeType,
        languageCode,
      })

      const text = first?.text || ''
      // If the user spoke a different language (common: native English speaker
      // asking "how do I say hello in Spanish?" while the tutor is configured
      // for Spanish STT), the explicit-language model returns empty. Retry
      // once with the fallback language so we still pick up the question.
      if (!text && fallbackLanguageCode && fallbackLanguageCode !== languageCode) {
        const second = await callDeepgram({
          apiKey,
          audioBuffer,
          mimeType,
          languageCode: fallbackLanguageCode,
        })
        if (second?.text) return second
      }
      return first
    },
  }
}
