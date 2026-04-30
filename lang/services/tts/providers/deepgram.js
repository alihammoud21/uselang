// Deepgram Aura TTS adapter.
//
// Two paths:
//   1) Single-voice synthesis from `text` + `voiceId` — used when the tutor
//      response is monolingual (or the orchestrator didn't supply segments).
//   2) Multilingual synthesis from `segments=[{lang, text}]` — picks the
//      right Aura voice per chunk and concatenates the resulting MP3 frames
//      into one playable buffer. This gives English narration + Spanish-
//      accented target words inside a single audio blob.
//
// MP3 concatenation: ID3 + frame headers self-sync, so naive byte-level
// concat produces a single playable file in every player we tested
// (expo-av, AVAudioPlayer, Chrome). No re-muxing needed.

import { assertEnv } from '../../shared/env.js'
import { getLanguageByCode } from '../../../lib/languages.js'

export function validateDeepgramTtsEnv(env = process.env) {
  assertEnv([env.DEEPGRAM_TTS_API_KEY ? 'DEEPGRAM_TTS_API_KEY' : 'DEEPGRAM_API_KEY'], env, 'Deepgram TTS')
}

export function createDeepgramTtsProvider(env = process.env) {
  validateDeepgramTtsEnv(env)
  const apiKey = env.DEEPGRAM_TTS_API_KEY || env.DEEPGRAM_API_KEY

  async function synthesizeOne({ text, voiceId }) {
    const cleaned = String(text || '').trim()
    if (!cleaned) return null
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceId)}&encoding=mp3`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleaned }),
      },
    )
    if (!response.ok) {
      const payload = await response.text().catch(() => '')
      throw new Error(
        payload ||
          `Deepgram synthesis failed (HTTP ${response.status}) for model ${voiceId || 'default'}`,
      )
    }
    return Buffer.from(await response.arrayBuffer())
  }

  function voiceForLang(langCode, fallbackVoiceId) {
    const lang = getLanguageByCode(langCode)
    return lang?.ttsModel || fallbackVoiceId
  }

  return {
    name: 'deepgram',
    /**
     * @param {Object} input
     * @param {string} [input.text]    Flat fallback text (used if no segments).
     * @param {string} [input.voiceId] Default voice for monolingual case.
     * @param {Array<{lang:string,text:string}>} [input.segments] Per-language chunks.
     * @param {string} [input.defaultLang] Fallback language when a segment lang is missing.
     */
    async synthesize({ text, voiceId, segments, defaultLang }) {
      // Multilingual path — preferred when segments are present.
      if (Array.isArray(segments) && segments.length) {
        const buffers = []
        for (const seg of segments) {
          const segVoice = voiceForLang(seg.lang || defaultLang, voiceId)
          if (!segVoice) continue
          try {
            const buf = await synthesizeOne({ text: seg.text, voiceId: segVoice })
            if (buf && buf.length) buffers.push(buf)
          } catch (err) {
            // Per-segment failures shouldn't kill the whole utterance —
            // we log and skip so the listener still hears the rest.
            console.warn(
              `[deepgram-tts] segment failed lang=${seg.lang} voice=${segVoice}:`,
              err?.message,
            )
          }
        }
        if (buffers.length) {
          return {
            audioBase64: Buffer.concat(buffers).toString('base64'),
            audioMimeType: 'audio/mpeg',
          }
        }
        // Fall through to single-voice path if every segment failed.
      }

      // Single-voice path.
      const buf = await synthesizeOne({ text, voiceId })
      if (!buf) {
        throw new Error('Deepgram synthesis: empty text.')
      }
      return {
        audioBase64: buf.toString('base64'),
        audioMimeType: 'audio/mpeg',
      }
    },
  }
}
