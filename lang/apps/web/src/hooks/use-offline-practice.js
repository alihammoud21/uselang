import { useCallback, useEffect, useState } from 'react'
import {
  base64ToBlob,
  deletePracticeItem,
  listPracticeItems,
  listUnsyncedItems,
  markSynced,
  savePracticeItem,
} from '@/lib/offline-store'

const PRACTICE_EVENT = 'lang:practice-updated'

function emitPracticeUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PRACTICE_EVENT))
}

// Optional best-effort sync — POSTs unsynced records to a Netlify function if it exists.
// Failures are silent so offline-first behaviour is preserved.
async function syncToCloud(record, idToken) {
  if (!idToken) return false
  try {
    const response = await fetch('/.netlify/functions/save-practice', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: record.id,
        sentence: record.sentence,
        phonetic: record.phonetic,
        translation: record.translation,
        language: record.language,
        scenarioLabel: record.scenarioLabel,
        createdAt: record.createdAt,
        userAudioSaved: Boolean(record.userAudioBlob),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export function useOfflinePractice({ idToken } = {}) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  const refresh = useCallback(async () => {
    try {
      const next = await listPracticeItems()
      setItems(next)
    } catch {
      // IndexedDB unavailable — degrade to empty list, app still works.
      setItems([])
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handlePracticeUpdate = () => refresh()
    const handleFocus = () => refresh()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(PRACTICE_EVENT, handlePracticeUpdate)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(PRACTICE_EVENT, handlePracticeUpdate)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  useEffect(() => {
    let cancelled = false

    async function syncPending() {
      if (!isOnline || !idToken) return
      const pending = await listUnsyncedItems().catch(() => [])
      if (!pending.length || cancelled) return

      for (const record of pending) {
        if (cancelled) return
        const ok = await syncToCloud(record, idToken)
        if (ok) {
          await markSynced(record.id)
        }
      }

      if (!cancelled) {
        await refresh()
      }
    }

    syncPending()

    return () => {
      cancelled = true
    }
  }, [idToken, isOnline, refresh])

  const savePractice = useCallback(
    async ({
      id,
      sentence,
      phonetic,
      translation,
      language,
      scenarioLabel,
      audioBase64,
      audioMimeType,
      userAudioBlob,
      userAudioMimeType,
    }) => {
      const blob = base64ToBlob(audioBase64, audioMimeType || 'audio/mpeg')
      if (!blob) {
        throw new Error('No audio available to download yet — play it once first.')
      }
      const record = await savePracticeItem({
        id: id || `practice-${Date.now()}`,
        sentence,
        phonetic: phonetic || '',
        translation: translation || '',
        language: language || '',
        scenarioLabel: scenarioLabel || '',
        audioBlob: blob,
        audioMimeType: audioMimeType || 'audio/mpeg',
        userAudioBlob: userAudioBlob || null,
        userAudioMimeType: userAudioMimeType || '',
      })
      await refresh()
      emitPracticeUpdate()
      // Best-effort cloud sync; only when online and authenticated.
      if (isOnline && idToken) {
        const ok = await syncToCloud(record, idToken)
        if (ok) {
          await markSynced(record.id)
          await refresh()
          emitPracticeUpdate()
        }
      }
      return record
    },
    [idToken, isOnline, refresh],
  )

  const removePractice = useCallback(
    async (id) => {
      await deletePracticeItem(id)
      await refresh()
      emitPracticeUpdate()
    },
    [refresh],
  )

  return {
    items,
    ready,
    isOnline,
    savePractice,
    removePractice,
    refresh,
  }
}
