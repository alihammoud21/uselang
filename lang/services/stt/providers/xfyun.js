// ── iFlytek (Xunfei) IAT Speech-to-Text provider ────────────────────────────
// Uses the WebSocket-based Interactive ASR (IAT) API via the Singapore
// endpoint — accessible from mainland China AND the US.
//
// Endpoint: ws://iat-api-sg.xf-yun.com/v2/iat
// Auth: HMAC-SHA256 (APIKey + APISecret), encoded as base64 query param.
// Audio: MP3 chunks sent as status 0 (first) / 1 (continue) / 2 (last).
//
// SDK calling needs APPID only. WebAPI calling needs APIKey + APISecret.

import crypto from 'crypto'

const XFYUN_HOST = 'iat-api-sg.xf-yun.com'
const XFYUN_PATH = '/v2/iat'
const XFYUN_WS_URL = `ws://${XFYUN_HOST}${XFYUN_PATH}`

// Language codes → iFlytek format
const LANG_MAP = {
  zh: 'zh_cn', 'zh-cn': 'zh_cn', 'zh-CN': 'zh_cn', 'zh-TW': 'zh_cn',
  en: 'en_us', 'en-us': 'en_us', 'en-US': 'en_us',
  ja: 'ja_jp', 'ja-JP': 'ja_jp',
  ko: 'ko_kr', 'ko-KR': 'ko_kr',
  fr: 'fr_fr', 'fr-FR': 'fr_fr', 'fr-CA': 'fr_fr',
  de: 'de_de', 'de-DE': 'de_de',
  es: 'es_es', 'es-ES': 'es_es', 'es-419': 'es_es',
  it: 'it_it', 'it-IT': 'it_it',
  pt: 'pt_pt', 'pt-PT': 'pt_pt', 'pt-BR': 'pt_pt',
  ru: 'ru_ru', 'ru-RU': 'ru_ru',
  ar: 'ar_eg', 'ar-SA': 'ar_eg',
}

function xfyunLang(code) {
  if (!code) return 'zh_cn'
  const mapped = LANG_MAP[code] || LANG_MAP[code.split('-')[0]]
  return mapped || 'en_us'
}

function buildAuthUrl({ apiKey, apiSecret }) {
  const date = new Date().toUTCString()
  const signatureOrigin = `host: ${XFYUN_HOST}\ndate: ${date}\nGET ${XFYUN_PATH} HTTP/1.1`
  const signatureSha = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64')
  const authorizationOrigin =
    `api_key="${apiKey}", algorithm="hmac-sha256", ` +
    `headers="host date request-line", signature="${signatureSha}"`
  const authorization = Buffer.from(authorizationOrigin).toString('base64')
  return (
    `${XFYUN_WS_URL}` +
    `?authorization=${encodeURIComponent(authorization)}` +
    `&date=${encodeURIComponent(date)}` +
    `&host=${XFYUN_HOST}`
  )
}

// Send audio buffer over an open WebSocket in frames:
//   status=0 (first frame), status=1 (intermediate), status=2 (last frame)
// iFlytek expects raw PCM at 16 kHz, or MP3 (lame). We use MP3 from the app.
// Frame interval: 40ms matches real-time streaming pace; too fast → dropped.
function sendAudioFrames(ws, audioBuffer, encoding, appId, lang) {
  return new Promise((resolve, reject) => {
    const CHUNK = 1280   // bytes per frame — ~40ms at 16kHz/16bit mono
    let offset = 0
    let first = true

    const sendNext = () => {
      if (ws.readyState !== 1 /* OPEN */) {
        reject(new Error('WebSocket closed before all audio was sent'))
        return
      }

      const end = Math.min(offset + CHUNK, audioBuffer.length)
      const chunk = audioBuffer.slice(offset, end)
      const isLast = end >= audioBuffer.length
      const status = first ? 0 : isLast ? 2 : 1

      const frame = {
        ...(first ? {
          common: { app_id: appId },
          business: {
            language: lang,
            domain: 'iat',
            accent: lang.startsWith('zh') ? 'mandarin' : lang.startsWith('en') ? 'en-us' : 'mandarin',
            vad_eos: 3000,
            dwa: 'wpgs',
            nunum: 0,
          },
        } : {}),
        data: {
          status,
          format: encoding === 'lame' ? 'audio/mpeg' : 'audio/L16;rate=16000',
          encoding,
          audio: chunk.toString('base64'),
        },
      }

      ws.send(JSON.stringify(frame))
      first = false
      offset = end

      if (isLast) {
        resolve()
      } else {
        setTimeout(sendNext, 40)
      }
    }

    sendNext()
  })
}

// Parse iFlytek IAT response: extracts the transcript text from result.ws[].cw[].w
function extractText(msg) {
  const result = msg?.data?.result
  if (!result) return ''
  // result.ws is an array of word segments
  const words = Array.isArray(result.ws) ? result.ws : []
  return words
    .map((w) =>
      Array.isArray(w.cw)
        ? w.cw.map((c) => c.w || '').join('')
        : ''
    )
    .join('')
}

async function transcribeWithXfyun({ appId, apiKey, apiSecret, audioBuffer, mimeType, languageCode }) {
  // Pick encoding: lame = MP3 (default from app), raw = PCM
  const encoding = (mimeType || '').includes('mpeg') || (mimeType || '').includes('mp3')
    ? 'lame'
    : 'raw'

  const lang = xfyunLang(languageCode)
  const url = buildAuthUrl({ apiKey, apiSecret })

  // Lazy-import ws so Node builtin fetch fallback is not needed in Netlify
  const { WebSocket } = await import('ws')

  return new Promise((resolve, reject) => {
    let transcript = ''
    let done = false
    let timer = null

    const finish = (text) => {
      if (done) return
      done = true
      clearTimeout(timer)
      ws.terminate()
      resolve({ text: text.trim() })
    }

    const fail = (err) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try { ws.terminate() } catch {
        // best-effort cleanup
      }
      reject(typeof err === 'string' ? new Error(err) : err)
    }

    timer = setTimeout(() => fail(new Error('iFlytek STT timeout after 30s')), 30_000)

    const ws = new WebSocket(url)

    ws.on('open', () => {
      sendAudioFrames(ws, audioBuffer, encoding, appId, lang).catch(fail)
    })

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }

      if (msg.code !== 0) {
        fail(`iFlytek error ${msg.code}: ${msg.message || 'unknown'}`)
        return
      }

      transcript += extractText(msg)

      // status=2 on data means the server has processed the last frame
      if (msg.data?.status === 2) {
        finish(transcript)
      }
    })

    ws.on('error', (err) => fail(err))

    ws.on('close', () => {
      if (!done) finish(transcript)
    })
  })
}

export function validateXfyunSttEnv(env = process.env) {
  const missing = []
  if (!env.XFYUN_APPID) missing.push('XFYUN_APPID')
  if (!env.XFYUN_API_KEY) missing.push('XFYUN_API_KEY')
  if (!env.XFYUN_API_SECRET) missing.push('XFYUN_API_SECRET')
  if (missing.length) {
    const err = new Error(`Missing iFlytek credentials: ${missing.join(', ')}`)
    err.code = 'MISSING_ENV'
    err.missingKeys = missing
    throw err
  }
}

export function createXfyunSttProvider(env = process.env) {
  const appId = env.XFYUN_APPID
  const apiKey = env.XFYUN_API_KEY
  const apiSecret = env.XFYUN_API_SECRET

  if (!appId || !apiKey || !apiSecret) {
    const missing = []
    if (!appId) missing.push('XFYUN_APPID')
    if (!apiKey) missing.push('XFYUN_API_KEY')
    if (!apiSecret) missing.push('XFYUN_API_SECRET')
    const err = new Error(`Missing iFlytek credentials: ${missing.join(', ')}`)
    err.code = 'MISSING_ENV'
    err.missingKeys = missing
    throw err
  }

  return {
    name: 'xfyun',
    async transcribe({ audioBuffer, mimeType, languageCode, fallbackLanguageCode }) {
      try {
        const result = await transcribeWithXfyun({ appId, apiKey, apiSecret, audioBuffer, mimeType, languageCode })
        // If primary language returned nothing, retry with fallback (e.g. English question in Chinese mode)
        if (!result.text && fallbackLanguageCode && fallbackLanguageCode !== languageCode) {
          const fallback = await transcribeWithXfyun({ appId, apiKey, apiSecret, audioBuffer, mimeType, languageCode: fallbackLanguageCode })
          if (fallback.text) return fallback
        }
        return result
      } catch (err) {
        // Rethrow with provider tag for logging
        err.provider = 'xfyun'
        throw err
      }
    },
  }
}
