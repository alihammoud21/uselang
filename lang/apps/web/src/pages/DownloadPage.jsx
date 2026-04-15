import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useState } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'
import { MarketingNav, MarketingFooter } from '@/pages/MarketingShared'

const PLATFORMS = [
  {
    id: 'web',
    label: 'Web App',
    sublabel: 'Any browser · No install',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    badge: 'Ready now',
    badgeColor: '#8a9c6e',
    description: 'Open UseLang in any modern browser — Chrome, Safari, Firefox, Edge. No account required to try it. Works on Mac, Windows, Linux, and any tablet or phone.',
    steps: ['Open your browser', 'Go to app.uselang.com', 'Hit the mic button', "You're speaking"],
    ctaLabel: 'Open in browser',
    ctaRoute: 'app',
  },
  {
    id: 'desktop',
    label: 'Desktop App',
    sublabel: 'Mac · Windows · Linux',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    badge: 'Coming soon',
    badgeColor: '#ff9f0a',
    description: 'A native desktop app gives you instant-access from your Dock or taskbar, better microphone control, and works whether or not a browser tab is open.',
    steps: ['Download the installer', 'Drag to Applications', 'Open with one click', 'Log in and go'],
    ctaLabel: 'Join waitlist',
    ctaRoute: 'signup',
  },
  {
    id: 'pwa',
    label: 'Add to Home Screen',
    sublabel: 'iPhone · iPad · Android',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
      </svg>
    ),
    badge: 'Ready now',
    badgeColor: '#8a9c6e',
    description: 'Add UseLang to your phone home screen in two taps. It looks and feels like a native app, works offline, and never needs an App Store update.',
    steps: ['Open in Safari or Chrome', 'Tap the share button', 'Add to Home Screen', 'Tap the icon to open'],
    ctaLabel: 'Open on mobile',
    ctaRoute: 'app',
  },
  {
    id: 'ios',
    label: 'iOS & Android App',
    sublabel: 'App Store · Google Play',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2C8.5 2 5.8 4.4 5 7.6L3.5 14l-1 4.5C2.3 19.6 3.1 21 4.5 21H6l.8-3h10.4l.8 3h1.5c1.4 0 2.2-1.4 2-2.5L20.5 14l-1.5-6.4C18.2 4.4 15.5 2 12 2z" />
        <circle cx="9" cy="11" r="1.5" />
        <circle cx="15" cy="11" r="1.5" />
      </svg>
    ),
    badge: 'Coming soon',
    badgeColor: '#5856d6',
    description: 'Full native apps for iPhone and Android are in development. Get push notifications for streaks, background audio, and deep OS integrations.',
    steps: ['Join the waitlist', 'Get early access invite', 'Download from the store', 'Sync with your account'],
    ctaLabel: 'Join waitlist',
    ctaRoute: 'signup',
  },
]

const DEVICE_PERKS = [
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" /></svg>,
    title: 'Works offline',
    desc: 'Practice pronunciation without internet. Syncs automatically when reconnected.',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    title: 'Your data stays yours',
    desc: 'Voice recordings are processed and discarded. Nothing stored without consent.',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
    title: 'Progress syncs everywhere',
    desc: 'Start on your laptop, continue on your phone. One account, all devices.',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    title: 'Instant load',
    desc: 'Under 2 seconds from tap to mic-ready. Faster than any native app install.',
  },
]

export function DownloadPage({ auth, route }) {
  const go = useCallback((path) => route.navigate(path), [route])
  const cta = auth.session ? APP_ROUTES.app : APP_ROUTES.signup
  const [active, setActive] = useState('web')

  const activePlan = PLATFORMS.find((p) => p.id === active)

  return (
    <div className="min-h-screen bg-white text-ink overflow-x-hidden">
      <MarketingNav auth={auth} go={go} />

      {/* Hero */}
      <section className="relative flex min-h-[56vh] flex-col items-center justify-center px-5 pt-20 pb-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-[500px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #c9a97a, transparent 65%)' }} />
        </div>

        <div className="relative w-full max-w-2xl text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="eyebrow mb-4">Get the app</motion.p>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-[clamp(2.2rem,6vw,3.5rem)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            UseLang on<br />
            <span className="gradient-text">every device you own</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="mx-auto mt-4 max-w-md text-[0.92rem] leading-[1.7] text-ink/40">
            Browser, laptop, phone — pick up where you left off, anywhere. One account covers all of them.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onClick={() => go(cta)}
              className="btn-primary !px-10 !py-4 !text-[0.92rem]"
              style={{ boxShadow: '0 10px 36px -8px rgba(201,169,122,0.42)' }}>
              {auth.session ? 'Open app' : 'Start for free'}
            </button>
            <a href="#platforms" className="btn-ghost !px-6 !py-4 !text-[0.88rem]">See all platforms</a>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-3 text-[0.7rem] text-ink/25">Free plan included. No credit card needed.</motion.p>
        </div>
      </section>

      {/* Platform picker */}
      <section id="platforms" className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          {/* tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {PLATFORMS.map((p) => (
              <button key={p.id} type="button" onClick={() => setActive(p.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[0.8rem] font-medium transition-all duration-200 ${
                  active === p.id
                    ? 'bg-ink text-white shadow-[0_4px_16px_-4px_rgba(15,20,25,0.25)]'
                    : 'bg-ink/[0.04] text-ink/50 hover:bg-ink/[0.07] hover:text-ink'
                }`}>
                <span className={active === p.id ? 'text-white' : 'text-ink/35'}>{p.icon}</span>
                <span>{p.label}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-semibold"
                  style={{ background: p.badgeColor + '22', color: p.badgeColor }}>
                  {p.badge}
                </span>
              </button>
            ))}
          </div>

          {/* active platform card */}
          <AnimatePresence mode="wait">
            <motion.div key={active}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="grid gap-8 lg:grid-cols-2 items-center rounded-3xl p-8 sm:p-12 bg-white border border-ink/[0.06]"
              style={{ boxShadow: '0 12px 48px -12px rgba(0,0,0,0.08)' }}>

              {/* left: info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                    {activePlan.icon}
                  </div>
                  <div>
                    <h3 className="text-[1.15rem] font-bold tracking-[-0.03em]">{activePlan.label}</h3>
                    <p className="text-[0.72rem] text-ink/35">{activePlan.sublabel}</p>
                  </div>
                  <span className="ml-auto rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold"
                    style={{ background: activePlan.badgeColor + '18', color: activePlan.badgeColor }}>
                    {activePlan.badge}
                  </span>
                </div>

                <p className="mt-4 text-[0.88rem] leading-[1.7] text-ink/50">{activePlan.description}</p>

                <div className="mt-8">
                  <button type="button" onClick={() => go(APP_ROUTES[activePlan.ctaRoute] || cta)}
                    className={`btn-primary !px-8 !py-3.5 !text-[0.85rem] ${activePlan.badge === 'Coming soon' ? 'opacity-80' : ''}`}>
                    {activePlan.ctaLabel}
                  </button>
                </div>
              </div>

              {/* right: steps */}
              <div className="rounded-2xl bg-[#f7f5f2] p-6">
                <p className="mb-5 text-[0.65rem] font-semibold uppercase tracking-[0.07em] text-ink/30">How to get started</p>
                <ol className="space-y-4">
                  {activePlan.steps.map((step, i) => (
                    <motion.li key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[0.7rem] font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="text-[0.85rem] font-medium text-ink/70">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Language Lens — Screen Agent */}
      <LanguageLensSection route={route} />

      {/* Perks grid */}
      <section className="py-12 px-5 bg-[#f9f7f4]">
        <div className="mx-auto max-w-4xl">
          <p className="mb-8 text-center text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-ink/25">On every platform</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEVICE_PERKS.map((perk, i) => (
              <motion.div key={perk.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl bg-white p-5 border border-ink/[0.05]"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/8 text-accent">
                  {perk.icon}
                </div>
                <h4 className="text-[0.85rem] font-bold">{perk.title}</h4>
                <p className="mt-1.5 text-[0.75rem] leading-[1.6] text-ink/40">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="mb-6 flex justify-center">
            <AISphere state="idle" activityLevel={0.25} size={80} disabled />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[clamp(1.6rem,4vw,2.2rem)] font-extrabold tracking-[-0.04em] leading-tight">
            Your tutor is always ready.<br />
            <span className="gradient-text">Are you?</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}
            className="mt-3 text-[0.86rem] leading-[1.65] text-ink/40">
            No download required. Open a tab and start speaking in under 30 seconds.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.14 }}
            className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onClick={() => go(cta)}
              className="btn-primary !px-10 !py-4 !text-[0.9rem]"
              style={{ boxShadow: '0 10px 36px -8px rgba(201,169,122,0.42)' }}>
              {auth.session ? 'Open app' : 'Start speaking now'}
            </button>
            <button type="button" onClick={() => go(APP_ROUTES.home + '#pricing')}
              className="btn-ghost !px-6 !py-4 !text-[0.86rem]">
              View pricing
            </button>
          </motion.div>
        </div>
      </section>

      <MarketingFooter go={go} />
    </div>
  )
}
