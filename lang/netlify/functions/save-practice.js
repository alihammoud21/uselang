import { fromFirestoreFields, toFirestoreFields } from '../../lib/firestore-values.js'
import { createDefaultUsageStats, mergeUsageStats } from '../../lib/usage-stats.js'

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

async function firestorePatch(pathname, data, idToken) {
  const fetchResponse = await fetch(documentUrl(pathname), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  })

  const payload = await fetchResponse.json().catch(() => null)

  if (!fetchResponse.ok) {
    throw new Error(payload?.error?.message || 'Unable to write Firestore document.')
  }

  return payload
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' })
  }

  try {
    const idToken = getBearerToken(event.headers)
    if (!idToken) {
      return response(401, { error: 'Missing Firebase token.' })
    }

    const decoded = decodeToken(idToken)
    const uid = decoded.user_id || decoded.sub
    const profilePath = `users/${uid}`
    const profile = await firestoreRead(profilePath, idToken)

    if (!profile) {
      return response(404, { error: 'User profile not found.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const record = {
      id: String(payload.id || Date.now()),
      sentence: String(payload.sentence || '').trim(),
      phonetic: String(payload.phonetic || '').trim(),
      translation: String(payload.translation || '').trim(),
      language: String(payload.language || '').trim(),
      scenarioLabel: String(payload.scenarioLabel || '').trim(),
      createdAt: payload.createdAt || new Date().toISOString(),
      userAudioSaved: Boolean(payload.userAudioSaved),
    }

    if (!record.sentence) {
      return response(400, { error: 'Sentence is required.' })
    }

    const nextSavedPractice = [
      record,
      ...((profile.savedPractice || []).filter((item) => item.id !== record.id)),
    ].slice(0, 50)

    const usageStats = mergeUsageStats(profile.usageStats || createDefaultUsageStats(), {
      downloadsSaved: 1,
    })

    await firestorePatch(
      profilePath,
      {
        ...profile,
        usageStats,
        savedPractice: nextSavedPractice,
        updatedAt: new Date().toISOString(),
      },
      idToken,
    )

    return response(200, { ok: true, savedPractice: nextSavedPractice })
  } catch (error) {
    return response(500, { error: error.message || 'Unable to save practice.' })
  }
}
