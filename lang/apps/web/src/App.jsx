import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { InstallPrompt } from '@/components/InstallPrompt'
import { useAuth } from '@/hooks/use-auth'
import { usePwaPrompt } from '@/hooks/use-pwa-prompt'
import { useRoute } from '@/hooks/use-route'
import { APP_ROUTES, isKnownRoute, isProtectedRoute } from '@/lib/routes'
import { AuthPage } from '@/pages/AuthPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LearningPage } from '@/pages/LearningPage'
import { MarketingPage } from '@/pages/MarketingPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TrainerPage } from '@/pages/TrainerPage'
import { UsageDashboardPage } from '@/pages/UsageDashboardPage'

const PAGE_TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

function resolvePage(pathname, auth, route) {
  switch (pathname) {
    case APP_ROUTES.login:
      return <AuthPage auth={auth} mode="login" route={route} />
    case APP_ROUTES.signup:
      return <AuthPage auth={auth} mode="signup" route={route} />
    case APP_ROUTES.onboarding:
      return <OnboardingPage auth={auth} route={route} />
    case APP_ROUTES.app:
      return <LearningPage auth={auth} route={route} />
    case APP_ROUTES.trainer:
      return <TrainerPage auth={auth} route={route} />
    case APP_ROUTES.history:
      return <HistoryPage auth={auth} route={route} />
    case APP_ROUTES.downloads:
      return <DownloadsPage auth={auth} route={route} />
    case APP_ROUTES.settings:
      return <SettingsPage auth={auth} route={route} />
    case APP_ROUTES.usageDashboard:
      return <UsageDashboardPage auth={auth} route={route} />
    default:
      return <MarketingPage auth={auth} route={route} />
  }
}

function BootingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0" />
            <path d="M12 18v3" />
          </svg>
        </div>
        <p className="text-[0.72rem] font-medium text-ink/25">Loading</p>
      </motion.div>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const auth = useAuth()
  const pwa = usePwaPrompt()
  const { navigate, pathname } = route

  useEffect(() => {
    if (auth.status !== 'ready') return

    if (pathname === APP_ROUTES.legacyHistory) {
      navigate(APP_ROUTES.history, { replace: true })
      return
    }
    if (!isKnownRoute(pathname)) {
      navigate(APP_ROUTES.home, { replace: true })
      return
    }
    if (!auth.session && isProtectedRoute(pathname)) {
      navigate(APP_ROUTES.login, { replace: true })
      return
    }
    if (auth.session && !auth.hasOnboarded && pathname !== APP_ROUTES.onboarding) {
      navigate(APP_ROUTES.onboarding, { replace: true })
      return
    }
    if (
      auth.session &&
      auth.hasOnboarded &&
      (pathname === APP_ROUTES.login || pathname === APP_ROUTES.signup || pathname === APP_ROUTES.onboarding)
    ) {
      navigate(APP_ROUTES.app, { replace: true })
    }
  }, [auth.hasOnboarded, auth.session, auth.status, navigate, pathname])

  if (auth.status !== 'ready') return <BootingScreen />

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.main key={route.pathname} {...PAGE_TRANSITION}>
          {resolvePage(route.pathname, auth, route)}
        </motion.main>
      </AnimatePresence>
      <InstallPrompt pwa={pwa} />
    </>
  )
}
