const DEFAULT_LOCAL_SERVICE_URL = 'http://127.0.0.1:8787'

function resolveConfiguredUrl() {
  return process.env.LESSON_SERVICE_URL || DEFAULT_LOCAL_SERVICE_URL
}

function isLocalHost(host = '') {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(host || ''))
}

export function shouldUseLocalGenerator(event = {}) {
  if (process.env.LESSON_SERVICE_URL) return true
  const host = event?.headers?.host || event?.headers?.Host || ''
  return isLocalHost(host)
}

export async function callLocalGenerator(pathname, payload, event = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6_000)

  try {
    const response = await fetch(`${resolveConfiguredUrl()}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-UseLang-Host': event?.headers?.host || event?.headers?.Host || '',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error || `Local generator failed with ${response.status}.`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}
