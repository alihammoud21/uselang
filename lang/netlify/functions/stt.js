import { getBearerToken } from '../../services/shared/firebase.js'
import { buildMissingEnvPayload } from '../../services/shared/env.js'
import { getSpeechToTextService } from '../../services/stt/index.js'

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  }
}

const MAX_AUDIO_BYTES = 8 * 1024 * 1024 // 8MB

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' })
  }

  try {
    const idToken = getBearerToken(event.headers)
    const devMode = String(process.env.LANG_DEV_MODE || '').trim() === '1'
    if (!idToken && !devMode) {
      return response(401, {
        error: 'Missing Firebase token.',
        hint: 'Set LANG_DEV_MODE=1 to bypass auth for development.',
      })
    }

    const payload = JSON.parse(event.body || '{}')
    const { audioBase64, mimeType, languageCode, fallbackLanguageCode, preferredProvider } = payload

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return response(400, { error: 'audioBase64 is required.' })
    }
    if (!languageCode || typeof languageCode !== 'string') {
      return response(400, { error: 'languageCode is required.' })
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    if (audioBuffer.length === 0) {
      return response(400, { error: 'Empty audio payload.' })
    }
    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return response(413, { error: 'Audio too large.' })
    }

    // If the client requested a specific provider (e.g. "xfyun" for China mode),
    // honour it; otherwise fall back to the configured server default.
    const stt = getSpeechToTextService(process.env, preferredProvider)
    const result = await stt.transcribe({
      audioBuffer,
      mimeType: mimeType || 'audio/m4a',
      languageCode,
      fallbackLanguageCode,
    })

    return response(200, {
      text: result.text || '',
      provider: stt.name,
    })
  } catch (error) {
    const missingEnv = buildMissingEnvPayload(error)
    if (missingEnv) return response(500, missingEnv)
    return response(500, { error: error.message || 'Transcription failed.' })
  }
}
