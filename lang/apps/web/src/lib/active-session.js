const ACTIVE_SESSION_KEY = 'lang.active.session'
const SESSION_EVENT = 'lang:active-session-updated'

function emitUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_EVENT))
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function loadActiveSession() {
  if (typeof window === 'undefined') return null
  return safeParse(localStorage.getItem(ACTIVE_SESSION_KEY))
}

export function saveActiveSession(session) {
  if (typeof window === 'undefined') return session
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
  emitUpdate()
  return session
}

export function updateActiveSession(updates) {
  const current = loadActiveSession()
  if (!current) return null
  return saveActiveSession({
    ...current,
    ...updates,
  })
}

export function clearActiveSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_SESSION_KEY)
  emitUpdate()
}

export function subscribeActiveSession(callback) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handle = () => callback(loadActiveSession())
  window.addEventListener(SESSION_EVENT, handle)
  window.addEventListener('storage', handle)
  window.addEventListener('focus', handle)

  return () => {
    window.removeEventListener(SESSION_EVENT, handle)
    window.removeEventListener('storage', handle)
    window.removeEventListener('focus', handle)
  }
}
