import { useCallback, useState } from 'react'
import {
  generateWithNativeGemma,
  getNativeGemmaStatus,
  hasNativeGemmaBridge,
  loadNativeGemmaModel,
} from '@/lib/native-shell'
import { stopOfflineSpeech, isOfflineTtsAvailable } from '@/lib/speech-synthesis'

export function useOfflineAI() {
  const [speaking, setSpeaking] = useState(false)
  const [lastResponse, setLastResponse] = useState(null)
  const [ttsAvailable] = useState(() => isOfflineTtsAvailable())
  const [localAiAvailable, setLocalAiAvailable] = useState(() => hasNativeGemmaBridge())

  const ensureLoaded = useCallback(async () => {
    if (!hasNativeGemmaBridge()) {
      setLocalAiAvailable(false)
      throw new Error('Local Gemma bridge is unavailable.')
    }
    const status = await getNativeGemmaStatus()
    if (!status?.isLoaded) {
      if (status?.state !== 'ready') {
        setLocalAiAvailable(false)
        throw new Error('Local Gemma model is not installed.')
      }
      await loadNativeGemmaModel()
    }
    setLocalAiAvailable(true)
  }, [])

  const ask = useCallback(async (prompt) => {
    await ensureLoaded()
    const result = await generateWithNativeGemma(String(prompt || ''))
    const text = typeof result === 'string' ? result : result?.text || ''
    setLastResponse(text)
    return text
  }, [ensureLoaded])

  const stop = useCallback(() => {
    stopOfflineSpeech()
    setSpeaking(false)
  }, [])

  const recheck = useCallback(async () => {
    const available = hasNativeGemmaBridge()
    if (!available) {
      setLocalAiAvailable(false)
      return { lessonGenAvailable: false, lmStudioAvailable: false }
    }

    try {
      const status = await getNativeGemmaStatus()
      setLocalAiAvailable(status?.state === 'ready' || status?.isLoaded === true)
    } catch {
      setLocalAiAvailable(false)
    }

    return { lessonGenAvailable: false, lmStudioAvailable: false }
  }, [])

  return {
    localAiAvailable,
    lessonGenAvailable: false,
    lmStudioAvailable: false,
    ttsAvailable,
    ask,
    stop,
    recheck,
    speaking,
    lastResponse,
  }
}
