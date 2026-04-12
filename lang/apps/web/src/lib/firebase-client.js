import { fromFirestoreFields, toFirestoreFields } from '@shared/firestore-values'
import { createDefaultUsageStats } from '@shared/usage-stats'

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCODxl4DJlYDyZ1b72l3J9cAIYg1QhwMNY',
  authDomain: 'uselang.firebaseapp.com',
  projectId: 'uselang',
  storageBucket: 'uselang.firebasestorage.app',
  messagingSenderId: '612079408083',
  appId: '1:612079408083:web:90943a0f2a941680579526',
  measurementId: 'G-7ZNCYDWXQH',
}

const AUTH_STORAGE_KEY = 'lang.auth.session'
const AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1'
const TOKEN_BASE = 'https://securetoken.googleapis.com/v1'
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error?.message ?? 'Request failed')
    error.status = response.status
    throw error
  }

  return data
}

function normalizeSession(payload) {
  return {
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    localId: payload.localId,
    email: payload.email,
    expiresAt: Date.now() + Number(payload.expiresIn ?? 3600) * 1000,
  }
}

function persistSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function getStoredSession() {
  const value = localStorage.getItem(AUTH_STORAGE_KEY)
  return value ? JSON.parse(value) : null
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function storeSession(session) {
  persistSession(session)
}

export async function refreshSession(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const data = await requestJson(`${TOKEN_BASE}/token?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  return normalizeSession({
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    localId: data.user_id,
    email: data.user_email,
    expiresIn: data.expires_in,
  })
}

export async function restoreSession() {
  const session = getStoredSession()

  if (!session) {
    return null
  }

  if (session.expiresAt > Date.now() + 60_000) {
    return session
  }

  const refreshed = await refreshSession(session.refreshToken)
  persistSession(refreshed)
  return refreshed
}

export function sessionNeedsRefresh(session) {
  return !session || session.expiresAt <= Date.now() + 60_000
}

export async function signInWithEmail({ email, password }) {
  const data = await requestJson(`${AUTH_BASE}/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  })

  const session = normalizeSession(data)
  persistSession(session)
  return session
}

export async function signUpWithEmail({ email, password }) {
  const data = await requestJson(`${AUTH_BASE}/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  })

  const session = normalizeSession(data)
  persistSession(session)
  return session
}

function authHeaders(idToken) {
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  }
}

function documentUrl(pathname) {
  return `${FIRESTORE_BASE}/${pathname}`
}

export function createDefaultProfile(email = '') {
  const now = new Date().toISOString()

  return {
    email,
    plan: 'base',
    trialActive: true,
    minutesUsedToday: 0,
    lastReset: now,
    languageLearning: '',
    nativeLanguage: '',
    goal: '',
    confidenceLevel: '',
    tutorStyle: '',
    correctionIntensity: 'balanced',
    voiceSpeed: 1,
    accent: 'standard',
    targetRegion: 'default',
    sayLikeLocal: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    createdAt: now,
    updatedAt: now,
    xp: 0,
    level: 1,
    streakCount: 0,
    longestStreak: 0,
    confidenceScore: 48,
    lastPracticeDate: '',
    lastPracticeAccuracy: 0,
    dailyChallengeCompletedAt: '',
    usageStats: createDefaultUsageStats(),
    sessionHistory: [],
    savedPractice: [],
  }
}

export function profileHasOnboarding(profile) {
  return Boolean(
    profile?.languageLearning &&
      profile?.nativeLanguage &&
      profile?.goal &&
      profile?.confidenceLevel &&
      profile?.tutorStyle,
  )
}

export async function getUserProfile(idToken, uid) {
  const response = await fetch(documentUrl(`users/${uid}`), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (response.status === 404) {
    return null
  }

  const document = await response.json()

  if (!response.ok) {
    const error = new Error(document?.error?.message ?? 'Unable to load profile')
    error.status = response.status
    throw error
  }

  return fromFirestoreFields(document.fields)
}

export async function saveUserProfile(idToken, uid, profile) {
  const payload = {
    fields: toFirestoreFields({
      ...profile,
      updatedAt: new Date().toISOString(),
    }),
  }

  await requestJson(documentUrl(`users/${uid}`), {
    method: 'PATCH',
    headers: authHeaders(idToken),
    body: JSON.stringify(payload),
  })

  return profile
}

export async function listUserSessions(idToken, uid) {
  const profile = await getUserProfile(idToken, uid)

  if (Array.isArray(profile?.sessionHistory)) {
    return [...profile.sessionHistory].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
  }

  const response = await fetch(`${documentUrl(`users/${uid}/sessions`)}?pageSize=25`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (response.status === 404 || response.status === 403) {
    return []
  }

  const payload = await response.json()

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Unable to load sessions')
    error.status = response.status
    throw error
  }

  return (payload.documents ?? [])
    .map((document) => ({
      id: document.name.split('/').pop(),
      ...fromFirestoreFields(document.fields),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export const firebaseConfig = FIREBASE_CONFIG
