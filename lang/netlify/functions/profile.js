import { saveProfile, loadProfile, verifyToken } from '../../services/shared/auth-store.js'
import { getBearerToken } from '../../services/shared/firebase.js'

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

function getUid(event) {
  const token = getBearerToken(event.headers)
  if (!token) throw new Error('Missing token.')
  // Try our self-hosted JWT first; if that fails and dev mode is on, allow
  // a passthrough uid for testing.
  try {
    const decoded = verifyToken(token)
    return decoded.sub
  } catch (err) {
    if (String(process.env.LANG_DEV_MODE || '') === '1') return 'dev'
    throw err
  }
}

export async function handler(event) {
  try {
    const uid = getUid(event)
    if (event.httpMethod === 'GET') {
      const profile = await loadProfile(uid)
      return response(200, { profile })
    }
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const profile = await saveProfile(uid, body)
      return response(200, { profile })
    }
    return response(405, { error: 'Method not allowed.' })
  } catch (err) {
    return response(401, { error: err.message || 'Auth failed.' })
  }
}
