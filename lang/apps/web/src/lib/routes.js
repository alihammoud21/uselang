export const APP_ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  onboarding: '/onboarding',
  app: '/app',
  trainer: '/trainer',
  history: '/progress',
  downloads: '/downloads',
  legacyHistory: '/history',
  settings: '/settings',
  usageDashboard: '/ling-one',
}

const KNOWN_ROUTES = new Set(Object.values(APP_ROUTES))
const PROTECTED_ROUTES = new Set([
  APP_ROUTES.app,
  APP_ROUTES.trainer,
  APP_ROUTES.history,
  APP_ROUTES.downloads,
  APP_ROUTES.legacyHistory,
  APP_ROUTES.settings,
  APP_ROUTES.onboarding,
  APP_ROUTES.usageDashboard,
])

export function isProtectedRoute(pathname) {
  return PROTECTED_ROUTES.has(pathname)
}

export function isKnownRoute(pathname) {
  return KNOWN_ROUTES.has(pathname)
}
