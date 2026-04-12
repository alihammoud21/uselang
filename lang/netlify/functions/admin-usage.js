import { fromFirestoreFields } from '../../lib/firestore-values.js'
import { getDailyLimit, getMinutesRemaining } from '../../lib/languages.js'
import { createDefaultUsageStats } from '../../lib/usage-stats.js'

const PROJECT_ID = 'uselang'
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

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

function getBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization
  return value?.startsWith('Bearer ') ? value.slice(7) : ''
}

function decodeToken(idToken) {
  const parts = idToken.split('.')
  if (parts.length < 2) {
    throw new Error('Invalid Firebase token.')
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

function documentUrl(pathname) {
  return `${FIRESTORE_BASE}/${pathname}`
}

async function firestoreRead(pathname, idToken) {
  const fetchResponse = await fetch(documentUrl(pathname), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (fetchResponse.status === 404) {
    return null
  }

  const payload = await fetchResponse.json()

  if (!fetchResponse.ok) {
    throw new Error(payload?.error?.message || 'Unable to read Firestore document.')
  }

  return fromFirestoreFields(payload.fields ?? {})
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'Method not allowed.' })
  }

  try {
    const expectedPassword = process.env.USAGE_DASHBOARD_PASSWORD
    const suppliedPassword =
      event.headers['x-usage-password'] ||
      event.headers['X-Usage-Password'] ||
      ''

    if (!expectedPassword) {
      return response(500, { error: 'USAGE_DASHBOARD_PASSWORD is not configured.' })
    }

    if (!suppliedPassword || suppliedPassword !== expectedPassword) {
      return response(403, { error: 'Incorrect dashboard password.' })
    }

    const idToken = getBearerToken(event.headers)
    if (!idToken) {
      return response(401, { error: 'Missing Firebase token.' })
    }

    const decoded = decodeToken(idToken)
    const uid = decoded.user_id || decoded.sub
    const profile = await firestoreRead(`users/${uid}`, idToken)

    if (!profile) {
      return response(404, { error: 'User profile not found.' })
    }

    const usageStats = {
      ...createDefaultUsageStats(),
      ...(profile.usageStats || {}),
    }

    return response(200, {
      email: profile.email || '',
      plan: profile.plan || 'base',
      trialActive: Boolean(profile.trialActive),
      dailyLimit: getDailyLimit(profile),
      minutesUsedToday: Number(profile.minutesUsedToday || 0),
      minutesRemaining: getMinutesRemaining(profile),
      savedPracticeCount: Array.isArray(profile.savedPractice) ? profile.savedPractice.length : 0,
      sessionHistoryCount: Array.isArray(profile.sessionHistory) ? profile.sessionHistory.length : 0,
      usageStats,
      recentSessions: (profile.sessionHistory || []).slice(0, 5).map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        scenarioLabel: session.scenarioLabel || session.modeTitle || 'Session',
        accuracy: Number(session.accuracy || 0),
        correctedPhrase: session.correctedPhrase || '',
      })),
    })
  } catch (error) {
    return response(500, { error: error.message || 'Unable to load dashboard usage.' })
  }
}
