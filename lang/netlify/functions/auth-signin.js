import { signin } from '../../services/shared/auth-store.js'

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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' })
  }
  try {
    const body = JSON.parse(event.body || '{}')
    const { email, password } = body
    const result = await signin({ email, password })
    return response(200, result)
  } catch (err) {
    return response(401, { error: err.message || 'Sign-in failed.' })
  }
}
