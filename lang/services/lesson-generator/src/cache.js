const cache = new Map()

export function buildCacheKey(prefix, payload) {
  return `${prefix}:${JSON.stringify(payload)}`
}

export function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

export function setCached(key, value, ttlMs = 5 * 60 * 1000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
  return value
}
