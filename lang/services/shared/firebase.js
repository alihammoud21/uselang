export function getBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization
  return value?.startsWith('Bearer ') ? value.slice(7) : ''
}

export function decodeToken(idToken) {
  const parts = String(idToken || '').split('.')
  if (parts.length < 2) {
    throw new Error('Invalid Firebase token.')
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}
