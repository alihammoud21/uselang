function truthy(value) {
  return Boolean(String(value || '').trim())
}

export function missingEnv(keys = [], env = process.env) {
  return keys.filter((key) => !truthy(env[key]))
}

export function assertEnv(keys = [], env = process.env, scope = 'runtime') {
  const missing = missingEnv(keys, env)
  if (missing.length) {
    const error = new Error(`Missing required environment variable${missing.length > 1 ? 's' : ''} for ${scope}: ${missing.join(', ')}`)
    error.code = 'MISSING_ENV'
    error.missing = missing
    error.scope = scope
    throw error
  }
  return true
}

export function readProvider(value, fallback = '') {
  return String(value || fallback || '').trim().toLowerCase()
}

export function optionalEnv(key, env = process.env, fallback = '') {
  const value = env[key]
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export function buildMissingEnvPayload(error) {
  if (!error || error.code !== 'MISSING_ENV') return null
  return {
    error: error.message,
    missingKeys: error.missing || [],
    scope: error.scope || 'runtime',
  }
}
