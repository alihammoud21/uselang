import { signup } from '../../services/shared/auth-store.js'

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
    const { email, password, profile } = body
    const result = await signup({ email, password, profile })
    return response(200, result)
  } catch (err) {
    const status = err.code === 'EMAIL_TAKEN' ? 409 : 400
    return response(status, { error: err.message || 'Sign-up failed.', code: err.code })
  }
}
