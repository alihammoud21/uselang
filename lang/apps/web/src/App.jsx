import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { InstallPrompt } from '@/components/InstallPrompt'
import { useAuth } from '@/hooks/use-auth'
import { usePwaPrompt } from '@/hooks/use-pwa-prompt'
import { useRoute } from '@/hooks/use-route'
import { APP_ROUTES, isKnownRoute, isProtectedRoute } from '@/lib/routes'
import { UseLangLogo } from '@/components/UseLangLogo'
import { isNativeShell } from '@/lib/native-shell'
import { AuthPage } from '@/pages/AuthPage'
import { LearningPage } from '@/pages/LearningPage'
import { MarketingPage } from '@/pages/MarketingPage'
import { HowItWorksPage } from '@/pages/HowItWorksPage'
import { DemoPage } from '@/pages/DemoPage'
import { LanguagesPage } from '@/pages/LanguagesPage'
import { DownloadPage } from '@/pages/DownloadPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DocsPage } from '@/pages/DocsPage'
import { TrainPage } from '@/pages/TrainPage'
import { GlobePage } from '@/pages/GlobePage'
import { HistoryPage } from '@/pages/HistoryPage'

// Dev preview mode: set localStorage.uselang_preview = '1' at runtime to bypass auth
function isPreviewMode() {
  return typeof window !== 'undefined' && !!localStorage.getItem('uselang_preview')
}

const PREVIEW_AUTH = {
  status: 'ready',
  session: { localId: 'preview', email: 'preview@uselang.app' },
  profile: {
    email: 'preview@uselang.app',
    languageLearning: 'fr',
    nativeLanguage: 'en',
    goal: 'travel',
    confidenceLevel: 'beginner',
    tutorStyle: 'conversational',
    confidenceScore: 42,
  },
  hasOnboarded: true,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {},
  updateProfile: async () => {},
  getValidSession: async () => null,
  refreshGoogleReadiness: () => {},
}

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
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
    case APP_ROUTES.train:
      return <TrainPage auth={auth} route={route} />
    case APP_ROUTES.globe:
      return <GlobePage auth={auth} route={route} />
    case APP_ROUTES.trainer:
      return <LearningPage auth={auth} route={route} />
    case APP_ROUTES.history:
      return <HistoryPage auth={auth} route={route} />
    case APP_ROUTES.downloads:
      return <DownloadsPage auth={auth} route={route} />
    case APP_ROUTES.settings:
      return <SettingsPage auth={auth} route={route} />
    case APP_ROUTES.howItWorks:
      return <HowItWorksPage auth={auth} route={route} />
    case APP_ROUTES.demo:
      return <DemoPage auth={auth} route={route} />
    case APP_ROUTES.languages:
      return <LanguagesPage auth={auth} route={route} />
    case APP_ROUTES.download:
      return <DownloadPage auth={auth} route={route} />
    case APP_ROUTES.docs:
      return <DocsPage auth={auth} route={route} />
    default:
      return <MarketingPage auth={auth} route={route} />
  }
}

function BootingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #faf6f1 100%)' }}>
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-3"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem]" style={{ background: 'rgba(201,169,122,0.10)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9a97a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0" />
            <path d="M12 18v3" />
          </svg>
        </div>
        <p className="text-[0.82rem] font-semibold tracking-[-0.01em] text-ink/40">Lane</p>
      </motion.div>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const _auth = useAuth()
  const auth = isPreviewMode() ? PREVIEW_AUTH : _auth
  const pwa = usePwaPrompt()
  const { navigate, pathname } = route

  useEffect(() => {
    if (isPreviewMode()) return // skip all redirects in preview mode
    if (auth.status !== 'ready') return

    if (pathname === APP_ROUTES.legacyHistory || pathname === APP_ROUTES.trainer) {
      navigate(APP_ROUTES.app, { replace: true })
      return
    }
    if (isNativeShell() && pathname === APP_ROUTES.home) {
      navigate(auth.session ? APP_ROUTES.app : APP_ROUTES.login, { replace: true })
      return
    }
    if (!isKnownRoute(pathname)) {
      navigate(isNativeShell() ? (auth.session ? APP_ROUTES.app : APP_ROUTES.login) : APP_ROUTES.home, { replace: true })
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

  /* scroll to top on route change */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

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
