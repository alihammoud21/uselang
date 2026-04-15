import { useCallback, useEffect, useRef, useState } from 'react'
import { speakOffline, stopOfflineSpeech, isOfflineTtsAvailable } from '@/lib/speech-synthesis'

const LESSON_GEN_URL = 'http://localhost:8787'
const LM_STUDIO_URL  = 'http://localhost:1234'

/**
 * Probe a URL with a short timeout.
 * Returns true if the server responds with any HTTP status.
 */
async function probe(url, timeoutMs = 2500) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return r.ok
  } catch {
    return false
  }
}

export function useOfflineAI() {
  // lesson-generator sidecar (Cloudflare Worker / local dev server)
  const [lessonGenAvailable, setLessonGenAvailable] = useState(false)
  // LM Studio running locally on port 1234
  const [lmStudioAvailable, setLmStudioAvailable] = useState(false)
  // Web Speech TTS
  const [ttsAvailable] = useState(() => isOfflineTtsAvailable())

  const [speaking, setSpeaking] = useState(false)
  const [lastResponse, setLastResponse] = useState(null)
  const pingDone = useRef(false)

  // Combined: any local AI is available
  const localAiAvailable = lessonGenAvailable || lmStudioAvailable

  useEffect(() => {
    if (pingDone.current) return
    pingDone.current = true

    // Probe both endpoints in parallel
    Promise.all([
      probe(`${LESSON_GEN_URL}/health`).then(setLessonGenAvailable),
      probe(`${LM_STUDIO_URL}/v1/models`).then(setLmStudioAvailable),
    ])
  }, [])

  /**
   * Re-probe both endpoints (call this when the user toggles offline mode or
   * after changing LM Studio settings).
   */
  const recheck = useCallback(async () => {
    const [gen, lm] = await Promise.all([
      probe(`${LESSON_GEN_URL}/health`),
      probe(`${LM_STUDIO_URL}/v1/models`),
    ])
    setLessonGenAvailable(gen)
    setLmStudioAvailable(lm)
    return { lessonGenAvailable: gen, lmStudioAvailable: lm }
  }, [])

  /**
   * Ask the lesson generator a question.
   * Routes to the lesson-generator sidecar if available, otherwise falls
   * back to a direct LM Studio request.
   * @param {string} text
   * @param {string} targetLang  UseLang language code, e.g. 'fr'
   * @returns {Promise<object|null>}
   */
  const ask = useCallback(async (text, targetLang = 'en') => {
    if (!localAiAvailable) return null

    try {
      let data = null

      if (lessonGenAvailable) {
        // Preferred: lesson-generator sidecar (structured JSON response)
        const res = await fetch(`${LESSON_GEN_URL}/generate-lesson`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase: text, targetLang }),
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) data = await res.json()
      }

      if (!data && lmStudioAvailable) {
        // Fallback: raw LM Studio chat completions
        const res = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma-3-4b-it',
            messages: [
              {
                role: 'system',
                content: `You are a ${targetLang} language tutor. When given a word or phrase, reply with a short translation and one example sentence in ${targetLang}. Keep it under 40 words.`,
              },
              { role: 'user', content: text },
            ],
            temperature: 0.5,
            max_tokens: 120,
          }),
          signal: AbortSignal.timeout(20000),
        })
        if (res.ok) {
          const raw = await res.json()
          const content = raw?.choices?.[0]?.message?.content ?? ''
          data = { text: content, _source: 'lm-studio' }
        }
      }

      if (!data) return null
      setLastResponse(data)

      // TTS: speak the target-language content if TTS is available
      if (ttsAvailable) {
        const toSpeak = data?.phrases?.[0]?.target ?? data?.text ?? null
        if (toSpeak) {
          setSpeaking(true)
          speakOffline(toSpeak, targetLang, 0.88, {
            onEnd: () => setSpeaking(false),
            onError: () => setSpeaking(false),
          })
        }
      }

      return data
    } catch {
      return null
    }
  }, [localAiAvailable, lessonGenAvailable, lmStudioAvailable, ttsAvailable])

  const stop = useCallback(() => {
    stopOfflineSpeech()
    setSpeaking(false)
  }, [])

  return {
    /** true if at least one local AI backend is reachable */
    localAiAvailable,
    lessonGenAvailable,
    lmStudioAvailable,
    ttsAvailable,
    ask,
    stop,
    recheck,
    speaking,
    lastResponse,
  }
}
