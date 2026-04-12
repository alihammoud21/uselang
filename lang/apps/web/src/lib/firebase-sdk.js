import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { firebaseConfig, storeSession } from '@/lib/firebase-client'

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

provider.setCustomParameters({
  prompt: 'select_account',
})

let persistencePromise = null

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
  await ensurePersistence()
  await signInWithRedirect(auth, provider)
  return { redirecting: true }
}

export async function consumeGoogleRedirectSession() {
  await ensurePersistence()

  const result = await getRedirectResult(auth).catch(() => null)
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
