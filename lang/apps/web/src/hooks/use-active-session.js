import { useEffect, useState } from 'react'
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
  subscribeActiveSession,
  updateActiveSession,
} from '@/lib/active-session'

export function useActiveSession() {
  const [session, setSession] = useState(() => loadActiveSession())

  useEffect(() => {
    return subscribeActiveSession((nextSession) => setSession(nextSession))
  }, [])

  return {
    session,
    save(sessionValue) {
      const next = saveActiveSession(sessionValue)
      setSession(next)
      return next
    },
    update(updates) {
      const next = updateActiveSession(updates)
      setSession(next)
      return next
    },
    clear() {
      clearActiveSession()
      setSession(null)
    },
  }
}
