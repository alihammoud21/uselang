function normalizeBaseUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
  return envBase || ''
}

export function buildApiUrl(pathname = '') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const base = getApiBaseUrl()
  return base ? `${base}${normalizedPath}` : normalizedPath
}

export function getAppStoreUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_APP_STORE_URL)
}
