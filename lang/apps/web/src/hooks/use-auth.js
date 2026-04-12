import { startTransition, useCallback, useEffect, useState } from 'react'
import {
  clearStoredSession,
  createDefaultProfile,
  getUserProfile,
  listUserSessions,
  profileHasOnboarding,
  refreshSession,
  restoreSession,
  saveUserProfile,
  sessionNeedsRefresh,
  signInWithEmail,
  signUpWithEmail,
  storeSession,
} from '@/lib/firebase-client'
import {
  consumeGoogleRedirectSession,
  signInWithGoogleProvider,
  signOutGoogleSession,
} from '@/lib/firebase-sdk'

export function useAuth() {
  const [status, setStatus] = useState('booting')
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        let restored = await consumeGoogleRedirectSession()

        if (!restored) {
          restored = await restoreSession()
        }

        if (!restored) {
          if (!cancelled) {
            setStatus('ready')
          }
          return
        }

        let nextProfile = await getUserProfile(restored.idToken, restored.localId)

        if (!nextProfile) {
          nextProfile = createDefaultProfile(restored.email)
          await saveUserProfile(restored.idToken, restored.localId, nextProfile)
        }

        if (!cancelled) {
          setSession(restored)
          setProfile(nextProfile)
          setStatus('ready')
        }
      } catch (authError) {
        clearStoredSession()
        if (!cancelled) {
          setError(authError.message)
          setStatus('ready')
        }
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  async function completeAuth(flow) {
    setBusy(true)
    setError('')

    try {
      const nextSession = await flow()
      if (nextSession?.redirecting) {
        return { redirecting: true }
      }
      let nextProfile = await getUserProfile(nextSession.idToken, nextSession.localId)

      if (!nextProfile) {
        nextProfile = createDefaultProfile(nextSession.email)
        await saveUserProfile(nextSession.idToken, nextSession.localId, nextProfile)
      }

      setSession(nextSession)
      setProfile(nextProfile)
      return { session: nextSession, profile: nextProfile }
    } catch (authError) {
      setError(authError.message)
      throw authError
    } finally {
      setBusy(false)
    }
  }

  const signIn = useCallback(async (values) => {
    return completeAuth(() => signInWithEmail(values))
  }, [])

  const signUp = useCallback(async (values) => {
    return completeAuth(() => signUpWithEmail(values))
  }, [])

  const signInWithGoogle = useCallback(async () => {
    return completeAuth(async () => {
      const result = await signInWithGoogleProvider()
      return result.redirecting ? { redirecting: true } : result.session
    })
  }, [])

  const getValidSession = useCallback(async () => {
    if (!session) {
      return null
    }

    if (!sessionNeedsRefresh(session)) {
      return session
    }

    const refreshed = await refreshSession(session.refreshToken)
    storeSession(refreshed)
    setSession(refreshed)
    return refreshed
  }, [session])

  const updateProfile = useCallback(async (updates) => {
    if (!session || !profile) {
      return null
    }

    setBusy(true)
    setError('')

    try {
      const activeSession = await getValidSession()
      const nextProfile = {
        ...profile,
        ...updates,
      }
      await saveUserProfile(activeSession.idToken, activeSession.localId, nextProfile)
      setProfile((current) => ({ ...current, ...nextProfile }))
      return nextProfile
    } catch (profileError) {
      setError(profileError.message)
      throw profileError
    } finally {
      setBusy(false)
    }
  }, [getValidSession, profile, session])

  const refreshProfile = useCallback(async () => {
    const activeSession = await getValidSession()

    if (!activeSession) {
      return null
    }

    const nextProfile = await getUserProfile(activeSession.idToken, activeSession.localId)
    setProfile(nextProfile)
    return nextProfile
  }, [getValidSession])

  const loadHistory = useCallback(async () => {
    const activeSession = await getValidSession()

    if (!activeSession) {
      return []
    }

    return listUserSessions(activeSession.idToken, activeSession.localId)
  }, [getValidSession])

  const applyServerProfile = useCallback((snapshot) => {
    if (!snapshot) {
      return
    }

    startTransition(() => {
      setProfile((current) => ({
        ...current,
        ...snapshot,
      }))
    })
  }, [])

  const signOut = useCallback(() => {
    clearStoredSession()
    signOutGoogleSession()
    setSession(null)
    setProfile(null)
    setError('')
  }, [])

  return {
    status,
    busy,
    session,
    profile,
    error,
    hasOnboarded: profileHasOnboarding(profile),
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
    loadHistory,
    applyServerProfile,
    getValidSession,
  }
}
