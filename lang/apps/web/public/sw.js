const CACHE_NAME = 'lang-shell-v2'
const APP_SHELL = [
  '/',
  '/login',
  '/signup',
  '/onboarding',
  '/app',
  '/trainer',
  '/progress',
  '/settings',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/sw.js',
]

function isAppRoute(url) {
  const { pathname, origin } = new URL(url)
  if (origin !== self.location.origin) return false
  return ['/', '/login', '/signup', '/onboarding', '/app', '/trainer', '/progress', '/settings'].includes(pathname)
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  if (
    event.request.method !== 'GET' ||
    !['http:', 'https:'].includes(requestUrl.protocol) ||
    requestUrl.origin !== self.location.origin ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/.netlify/functions/')
  ) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => undefined)
          return response
        })
        .catch(async () => {
          if (isAppRoute(event.request.url)) {
            return caches.match(event.request).then((routeMatch) => routeMatch || caches.match('/app') || caches.match('/'))
          }
          return caches.match('/')
        })
    }),
  )
})
