import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { firebaseConfig, storeSession } from '@/lib/firebase-client'
import { isNativeShell } from '@/lib/native-shell'

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

provider.setCustomParameters({
  prompt: 'select_account',
})

let persistencePromise = null
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1'])

function isIpAddress(hostname = '') {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function buildGoogleAuthError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

export function getGoogleAuthReadiness() {
  if (typeof window === 'undefined') {
    return {
      available: false,
      code: 'auth/unavailable',
      message: 'Google sign-in only runs in the browser.',
    }
  }

  if (!navigator.onLine) {
    return {
      available: false,
      code: 'auth/network-request-failed',
      message: 'You are offline. Reconnect before using Google sign-in.',
    }
  }

  const hostname = window.location.hostname || ''

  if (isIpAddress(hostname) && !LOCALHOST_HOSTS.has(hostname)) {
    return {
      available: false,
      code: 'auth/unauthorized-domain',
      message: `Google sign-in is blocked on ${hostname}. Add this host to Firebase Authorized Domains or use localhost during development.`,
      host: hostname,
      needsAuthorizedDomain: true,
    }
  }

  return {
    available: true,
    code: '',
    message: '',
    host: hostname,
  }
}

function buildSessionFromUser(user, idTokenResult) {
  return {
    idToken: idTokenResult.token,
    refreshToken: user.refreshToken,
    localId: user.uid,
    email: user.email || '',
    expiresAt: Date.parse(idTokenResult.expirationTime),
  }
}

async function ensurePersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch(() => undefined)
  }
  await persistencePromise
}

async function sessionFromUser(user) {
  const idTokenResult = await user.getIdTokenResult()
  const session = buildSessionFromUser(user, idTokenResult)
  storeSession(session)
  return session
}

function normalizeFirebaseError(error) {
  const code = error?.code || ''

  if (code === 'auth/popup-blocked') {
    return buildGoogleAuthError(
      code,
      'The browser blocked the Google sign-in popup. Allow popups for this site or try again.',
    )
  }

  if (code === 'auth/popup-closed-by-user') {
    return buildGoogleAuthError(code, 'Google sign-in was closed before it finished. Try again.')
  }

  if (code === 'auth/network-request-failed') {
    return buildGoogleAuthError(code, 'Network error while contacting Google. Check the connection and retry.')
  }

  if (code === 'auth/unauthorized-domain') {
    const readiness = getGoogleAuthReadiness()
    return buildGoogleAuthError(
      code,
      readiness.message || 'This host is not authorized for Google sign-in in Firebase.',
      readiness,
    )
  }

  if (code === 'auth/operation-not-supported-in-this-environment') {
    return buildGoogleAuthError(
      code,
      'Google sign-in is not supported in this environment with a popup. The app will retry with redirect.',
    )
  }

  return buildGoogleAuthError(code || 'auth/unknown', error?.message || 'Google sign-in failed.', error?.details || {})
}

async function waitForAuthReady() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
    return
  }

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      resolve()
    })
  })
}

export async function signInWithGoogleProvider() {
  const readiness = getGoogleAuthReadiness()
  if (!readiness.available) {
    throw buildGoogleAuthError(readiness.code, readiness.message, readiness)
  }

  await ensurePersistence()

  if (isNativeShell()) {
    await signInWithRedirect(auth, provider)
    return { redirecting: true }
  }

  try {
    const result = await signInWithPopup(auth, provider)
    return {
      redirecting: false,
      session: await sessionFromUser(result.user),
    }
  } catch (rawError) {
    const error = normalizeFirebaseError(rawError)

    if (error.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return { redirecting: true }
    }

    throw error
  }
}

export async function consumeGoogleRedirectSession() {
  await ensurePersistence()

  const result = await getRedirectResult(auth).catch((error) => {
    throw normalizeFirebaseError(error)
  })
  if (result?.user) {
    return sessionFromUser(result.user)
  }

  await waitForAuthReady()
  if (auth.currentUser) {
    return sessionFromUser(auth.currentUser)
  }

  return null
}

export async function signOutGoogleSession() {
  await signOut(auth).catch(() => undefined)
}
