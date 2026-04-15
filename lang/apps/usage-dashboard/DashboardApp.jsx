import { useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { UsageDashboardPage } from '@/pages/UsageDashboardPage'

const MAIN = (import.meta.env.VITE_MAIN_APP_ORIGIN || 'http://localhost:3001').replace(/\/$/, '')

export function DashboardApp() {
  const auth = useAuth()
  const route = useMemo(
    () => ({
      pathname: '/',
      navigate: (path) => {
        if (typeof path === 'string' && /^https?:\/\//.test(path)) {
          window.location.href = path
          return
        }
        const p = path.startsWith('/') ? path : `/${path}`
        window.location.href = `${MAIN}${p}`
      },
    }),
    [],
  )

  if (auth.status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
        <p className="text-[0.85rem] text-ink/40">Loading…</p>
      </div>
    )
  }

  return <UsageDashboardPage auth={auth} route={route} />
}
