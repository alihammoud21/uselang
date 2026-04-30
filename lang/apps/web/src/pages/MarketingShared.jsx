import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { APP_ROUTES } from '@/lib/routes'
import { UseLangLogo } from '@/components/UseLangLogo'

const NAV_LINKS = [
  { label: 'How it works', anchor: 'how-it-works' },
  { label: 'Languages', route: 'languages' },
  { label: 'Pricing', anchor: 'pricing' },
  { label: 'Resources', route: 'docs' },
]

const DESKTOP_MENUS = {
  Languages: [
    { title: 'French', detail: 'Pronunciation coaching for travel, cafés, and daily conversation.', route: 'languages' },
    { title: 'Mandarin', detail: 'Pinyin, tones, and practical survival phrases.', route: 'languages' },
    { title: 'Arabic', detail: 'Speak more naturally with guided local phrasing.', route: 'languages' },
    { title: 'Hindi', detail: 'Core phrase practice and clean speaking drills.', route: 'languages' },
  ],
  Resources: [
    { title: 'Help center', detail: 'Setup, troubleshooting, and account basics.', route: 'docs' },
    { title: 'How it works', detail: 'See the voice-first flow before you start.', anchor: 'how-it-works' },
    { title: 'Download guide', detail: 'Install UseLang on your phone or desktop.', route: 'download' },
  ],
}

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    window.location.href = `/#${id}`
  }
}

export function MarketingNav({ auth, go }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  function handleLink(link) {
    setMobileOpen(false)
    setActiveMenu(null)
    if (link.anchor) {
      scrollTo(link.anchor)
    } else {
      go(APP_ROUTES[link.route])
    }
  }

  return (
    <>
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[#faf7ef]/88 backdrop-blur-2xl'
          : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-[1440px] px-5 pt-4 lg:px-10">
          <div className="grid h-[6.15rem] grid-cols-[auto_1fr_auto] items-center gap-6 rounded-[1.4rem] border border-[#d8d0bf] bg-[#fffdf2]/96 px-6 shadow-[0_10px_30px_-24px_rgba(80,65,35,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]">
            <button
              type="button"
              onClick={() => go(APP_ROUTES.home)}
              className="flex items-center gap-3 rounded-[1rem] px-1 py-1 transition"
            >
              <BrandGlyph />
              <span className="text-[1rem] font-semibold tracking-[-0.03em] text-[#181512]">Lane</span>
            </button>

            <nav
              className="hidden min-w-0 items-center justify-center gap-3 md:flex"
              onMouseLeave={() => setActiveMenu(null)}
            >
              {NAV_LINKS.map((link) => (
                <div key={link.label} className="relative">
                  <button
                    type="button"
                    onClick={() => handleLink(link)}
                    onMouseEnter={() => setActiveMenu(DESKTOP_MENUS[link.label] ? link.label : null)}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] font-medium tracking-[-0.02em] text-[#24201b] transition hover:bg-[#f4eedf]"
                  >
                    <span>{link.label}</span>
                    {DESKTOP_MENUS[link.label] ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="text-[#5f574d]">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    ) : null}
                  </button>

                  <AnimatePresence>
                    {activeMenu === link.label && DESKTOP_MENUS[link.label] ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-1/2 top-[calc(100%+0.9rem)] z-50 hidden w-[23rem] -translate-x-1/2 rounded-[1.25rem] border border-[#ddd3bf] bg-[#fffdf6] p-3 shadow-[0_24px_50px_-30px_rgba(70,55,30,0.24)] lg:block"
                        onMouseEnter={() => setActiveMenu(link.label)}
                      >
                        <div className="grid gap-1.5">
                          {DESKTOP_MENUS[link.label].map((item) => (
                            <button
                              key={item.title}
                              type="button"
                              onClick={() => handleLink(item)}
                              className="rounded-[1rem] px-3.5 py-3 text-left transition hover:bg-[#f4eedf]"
                            >
                              <p className="text-[0.86rem] font-semibold tracking-[-0.02em] text-[#1f1a15]">{item.title}</p>
                              <p className="mt-1 text-[0.76rem] leading-snug text-[#72685c]">{item.detail}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            <div className="flex items-center justify-self-end gap-4">
              <button
                type="button"
                onClick={() => go(APP_ROUTES.download)}
                className="hidden md:inline-flex items-center justify-center rounded-[1rem] border-2 border-[#26211c] bg-white px-6 py-3 text-[0.95rem] font-semibold tracking-[-0.02em] text-[#1d1915] transition hover:bg-[#fcfaf4]"
              >
                Download now
              </button>
              <div className="hidden h-12 w-px bg-[#ddd3bf] md:block" />
              {auth.session ? (
                <button
                  type="button"
                  onClick={() => go(APP_ROUTES.app)}
                  className="hidden md:inline-flex items-center justify-center rounded-[1rem] border-2 border-[#2d231d] bg-[#e4cdf6] px-6 py-3 text-[0.95rem] font-semibold tracking-[-0.02em] text-[#1d1915] transition hover:bg-[#dbc0f2]"
                >
                  Open app
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(APP_ROUTES.signup)}
                  className="hidden md:inline-flex items-center justify-center rounded-[1rem] border-2 border-[#2d231d] bg-[#e4cdf6] px-6 py-3 text-[0.95rem] font-semibold tracking-[-0.02em] text-[#1d1915] transition hover:bg-[#dbc0f2]"
                >
                  Start free
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ddd3bf] bg-white/92 transition hover:bg-white md:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#5a5248]">
                  {mobileOpen
                    ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                    : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-[6.4rem] z-40 border-b border-[#d8d0bf] bg-[#fffdf2]/96 backdrop-blur-2xl px-5 pb-5 pt-3 md:hidden">
            <nav className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleLink(link)}
                  className="rounded-[1rem] px-4 py-3 text-left text-[0.9rem] font-medium text-[#3b342c] transition hover:bg-[#f4eedf]"
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { go(APP_ROUTES.download); setMobileOpen(false) }}
                className="flex-1 rounded-[1rem] border-2 border-[#26211c] bg-white py-3 text-[0.88rem] font-semibold text-[#1d1915]"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => { go(auth.session ? APP_ROUTES.app : APP_ROUTES.signup); setMobileOpen(false) }}
                className="flex-1 rounded-[1rem] border-2 border-[#2d231d] bg-[#e4cdf6] py-3 text-[0.88rem] font-semibold text-[#1d1915]"
              >
                {auth.session ? 'Open app' : 'Start free'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function BrandGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="1.5" y="1.5" width="25" height="25" rx="7" fill="#fff8df" stroke="#e2d5b8" />
      <path d="M7 18V10" stroke="#1b1713" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 21V7" stroke="#1b1713" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15 17V11" stroke="#1b1713" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19 20V8" stroke="#1b1713" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M23 15V13" stroke="#1b1713" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function MarketingFooter({ go }) {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-[#c9a97a]/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="lg:col-span-1">
            <UseLangLogo size="sm" />
            <p className="mt-3 text-[0.78rem] leading-[1.65] text-ink/35 max-w-[220px]">
              Voice-first AI language coaching. Speak any language with real confidence.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Twitter" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/[0.04] text-ink/28 transition hover:bg-[#c9a97a]/[0.08] hover:text-ink/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/[0.04] text-ink/28 transition hover:bg-[#c9a97a]/[0.08] hover:text-ink/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" /></svg>
              </a>
            </div>
          </div>

          {/* product */}
          <div>
            <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink/25">Product</p>
            <ul className="space-y-2.5">
              {[
                { label: 'How it works', anchor: 'how-it-works' },
                { label: 'Languages', route: 'languages' },
                { label: 'Pricing', anchor: 'pricing' },
                { label: 'Download', route: 'download' },
                { label: 'Docs', route: 'docs' },
              ].map((item) => (
                <li key={item.label}>
                  <button type="button"
                    onClick={() => item.anchor ? scrollTo(item.anchor) : go(APP_ROUTES[item.route])}
                    className="text-[0.78rem] text-ink/40 transition hover:text-ink">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* languages */}
          <div>
            <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink/25">Languages</p>
            <ul className="space-y-2.5">
              {['French', 'Spanish', 'Arabic', 'Mandarin', 'Italian', 'English'].map((lang) => (
                <li key={lang}>
                  <button type="button" onClick={() => go(APP_ROUTES.languages)}
                    className="text-[0.78rem] text-ink/40 transition hover:text-ink">{lang}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* company */}
          <div>
            <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink/25">Company</p>
            <ul className="space-y-2.5">
              {['About', 'Blog', 'Careers', 'Privacy', 'Terms'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[0.78rem] text-ink/40 transition hover:text-ink">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink/[0.04] pt-6 sm:flex-row">
          <p className="text-[0.7rem] text-ink/20">&copy; {year} Lane. All rights reserved.</p>
          <p className="text-[0.7rem] text-ink/18">Made with care for language learners everywhere.</p>
        </div>
      </div>
    </footer>
  )
}
