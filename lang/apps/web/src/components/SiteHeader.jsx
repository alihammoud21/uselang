import { motion } from 'framer-motion'
import { APP_ROUTES } from '@/lib/routes'

const APP_LINKS = [
  { label: 'Practice', path: APP_ROUTES.app },
  { label: 'History', path: APP_ROUTES.history },
  { label: 'Settings', path: APP_ROUTES.settings },
]

export function SiteHeader({ auth, route }) {
  const isMarketing = route.pathname === APP_ROUTES.home || route.pathname === APP_ROUTES.login || route.pathname === APP_ROUTES.signup
  const isMarketingHome = route.pathname === APP_ROUTES.home

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl ${
        isMarketingHome ? 'border-b border-black/6 bg-[#f6f2eb]/88' : 'border-b border-white/6 bg-[#050916]/70'
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <button
          onClick={() => route.navigate(APP_ROUTES.home)}
          className="flex items-center gap-3 text-left"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isMarketingHome ? 'border border-black/8 bg-white' : 'border border-white/10 bg-white/5'
            }`}
          >
            <div
              className={`h-6 w-6 rounded-full ${
                isMarketingHome
                  ? 'border border-[#e7b3a7] bg-[radial-gradient(circle_at_top,#ffd7c7_0%,transparent_55%),#171310]'
                  : 'border border-accent/60 bg-[radial-gradient(circle_at_top,#7bf0d660_0%,transparent_55%),#0d1d35]'
              }`}
            />
          </div>
          <div>
            <p className={`font-display text-lg tracking-[0.18em] ${isMarketingHome ? 'text-[#181512]' : 'text-white/55'}`}>LANG</p>
            <p className={`text-xs ${isMarketingHome ? 'text-black/45' : 'text-white/45'}`}>Private voice tutor</p>
          </div>
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          {isMarketing ? (
            <>
              <button
                className={`text-sm transition ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                onClick={() => route.navigate(APP_ROUTES.home)}
              >
                Overview
              </button>
              <a
                className={`text-sm transition ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                href="#how-it-works"
              >
                How it works
              </a>
              <a
                className={`text-sm transition ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                href="#demos"
              >
                Demos
              </a>
              <a
                className={`text-sm transition ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                href="#pricing"
              >
                Pricing
              </a>
              <a
                className={`text-sm transition ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                href="#faq"
              >
                FAQ
              </a>
            </>
          ) : (
            APP_LINKS.map((item) => (
              <button
                key={item.path}
                className={`text-sm transition ${
                  route.pathname === item.path ? 'text-white' : 'text-white/55 hover:text-white'
                }`}
                onClick={() => route.navigate(item.path)}
              >
                {item.label}
              </button>
            ))
          )}
        </nav>

        <div className="flex items-center gap-3">
          {auth.session ? (
            <>
              <button
                className={`hidden rounded-full px-4 py-2 text-sm transition md:block ${
                  isMarketingHome
                    ? 'border border-black/10 text-black/72 hover:border-black/20 hover:text-black'
                    : 'border border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                }`}
                onClick={() => route.navigate(APP_ROUTES.app)}
              >
                Open app
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  auth.signOut()
                  route.navigate(APP_ROUTES.home)
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium ${isMarketingHome ? 'bg-[#181512] text-white' : 'bg-white text-[#07101F]'}`}
              >
                Sign out
              </motion.button>
            </>
          ) : (
            <>
              <button
                className={`hidden text-sm transition md:block ${isMarketingHome ? 'text-black/62 hover:text-black' : 'text-white/65 hover:text-white'}`}
                onClick={() => route.navigate(APP_ROUTES.login)}
              >
                Log in
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => route.navigate(APP_ROUTES.signup)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  isMarketingHome ? 'bg-[#181512] text-white' : 'bg-accent text-[#07101F]'
                }`}
              >
                Start free trial
              </motion.button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
