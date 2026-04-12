import { useCallback, useEffect, useMemo, useState } from 'react'

function normalizePath(pathname = '/') {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function useRoute() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((nextPath, options = {}) => {
    const method = options.replace ? 'replaceState' : 'pushState'
    const normalizedPath = normalizePath(nextPath)
    window.history[method]({}, '', normalizedPath)
    setPathname(normalizedPath)
  }, [])

  return useMemo(
    () => ({
      pathname,
      navigate,
    }),
    [navigate, pathname],
  )
}
