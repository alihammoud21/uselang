import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const HERO_LINES = [
  'Order food without freezing',
  'Stop sounding like Google Translate',
  'Speak like you actually live there',
  'Sound natural — not robotic',
  'Have a real conversation on day one',
]

const USE_CASES = [
  {
    id: 'restaurant',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>,
    label: 'Restaurant',
    phrase: "Une table pour deux, s'il vous plaît",
    translation: 'A table for two, please',
    correction: { wrong: 'tab', right: 'table', tip: "Tongue tip behind upper teeth for the \"bl\" — don't swallow the ending." },
    score: 87,
  },
  {
    id: 'travel',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>,
    label: 'Travel',
    phrase: 'Où est la station de métro\u00A0?',
    translation: 'Where is the metro station?',
    correction: { wrong: 'sta-see-on', right: 'sta-syon', tip: 'French "tion" = "syon" — lips forward, nasal ending.' },
    score: 72,
  },
  {
    id: 'smalltalk',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    label: 'Small talk',
    phrase: "Enchanté, je m'appelle…",
    translation: 'Nice to meet you, my name is…',
    correction: { wrong: 'en-chan-tay', right: 'ãʃɑ̃te', tip: 'Nasal "ã" — air through nose, not "en". Round lips slightly.' },
    score: 91,
  },
]

const WHY_WORKS = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>, title: 'Speak immediately', detail: 'No tapping words. No matching pictures. You open your mouth from second one.' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" /><path d="M9.5 14.5L7 22l5-3 5 3-2.5-7.5" /><path d="M6 10a6 6 0 0012 0" /></svg>, title: 'AI corrects you live', detail: 'Word-level scoring with tongue placement, lip shape, and airflow — not "try again".' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>, title: 'Real-life scenarios only', detail: 'You tell the AI what you need. It builds a custom session — no preset lesson trees.' },
]

const WHAT_HAPPENS = [
  { step: '01', title: 'You say what you need', detail: '"I want to order food in French" — the AI understands and starts building.' },
  { step: '02', title: 'AI builds a real scenario', detail: '4 phrases, estimated time, difficulty level — personalized to your level.' },
  { step: '03', title: 'You speak + get corrected instantly', detail: 'Every word scored. Tongue diagrams for mistakes. Replay at any speed.' },
]

const OUTCOMES = [
  { label: 'Ordering food without hesitation', icon: <OutcomeIcon kind="restaurant" /> },
  { label: 'Sounding natural, not robotic', icon: <OutcomeIcon kind="voice" /> },
  { label: 'Understanding fast speakers', icon: <OutcomeIcon kind="ear" /> },
  { label: 'Having real conversations', icon: <OutcomeIcon kind="chat" /> },
  { label: 'Handling unexpected situations', icon: <OutcomeIcon kind="spark" /> },
  { label: 'Feeling confident, not anxious', icon: <OutcomeIcon kind="growth" /> },
]

const COMMON_MISTAKES = [
  { wrong: 'Merci bo-coo', right: 'M\u025B\u0281si boku', lang: 'French', note: 'The "r" is in the throat, not the mouth. The "eau" is a pure "o".' },
  { wrong: 'Gra-see-as', right: '\u02C8g\u027Ea.sjas', lang: 'Spanish', note: 'Soft "r" \u2014 tongue taps once. "Cias" is one syllable, not two.' },
  { wrong: 'Shukran', right: '\u0283uk.ran', lang: 'Arabic', note: 'The "\u0634" is a deep "sh" \u2014 tongue pulled back, not forward like English.' },
]

const TESTIMONIALS = [
  { name: 'Sarah K.', detail: 'Learning French \u00B7 3 months', text: 'Duolingo taught me to tap words. UseLang taught me to actually say them. My Airbnb host in Paris understood me on the first try.', avatar: 'S', color: '#ff6b9d' },
  { name: 'Marco T.', detail: 'Learning Spanish \u00B7 6 weeks', text: 'The tongue placement diagrams made the Spanish R click after years of struggling. My wife is from Madrid \u2014 she noticed day one.', avatar: 'M', color: '#007aff' },
  { name: 'Yuki A.', detail: 'Learning English \u00B7 2 months', text: 'I got compliments on my pronunciation at work for the first time. The corrections are specific \u2014 not just "try again".', avatar: 'Y', color: '#5856d6' },
  { name: 'David R.', detail: 'Learning Arabic \u00B7 1 month', text: 'Finally something that teaches the sounds, not just the words. Arabic pronunciation clicked after one session.', avatar: 'D', color: '#ff9f0a' },
]

const FAQ = [
  { q: 'How is this different from Duolingo?', a: 'Duolingo teaches you to read and tap. UseLang teaches you to speak. You open your mouth from second one, and the AI corrects every word with actual pronunciation technique \u2014 tongue placement, lip shape, airflow.' },
  { q: 'Do I need to download anything?', a: "No. UseLang works in your browser and installs to your home screen like a native app. We're also preparing for the App Store." },
  { q: 'What does free include?', a: '2 minutes of voice practice per day, full pronunciation coaching with tongue diagrams, progress tracking, and the sentence studio. No credit card required.' },
  { q: 'What languages are supported?', a: 'French, Spanish, Arabic, Chinese (Mandarin), English, and Italian. Each language has tailored pronunciation guidance with accent-specific coaching.' },
  { q: 'Can I prepare for a trip?', a: 'That\'s exactly what it\'s for. Say "I\'m going to Paris next week" and the AI builds practice for ordering food, getting directions, checking into hotels.' },
  { q: 'How fast will I see results?', a: 'Most users report noticeable improvement in pronunciation within the first session. Real conversational confidence typically develops within 1\u20132 weeks of daily practice.' },
]

const DEMO_KEY = 'uselang_demo_used'
function hasDemoBeenUsed() { try { return localStorage.getItem(DEMO_KEY) === '1' } catch { return false } }
function markDemoUsed() { try { localStorage.setItem(DEMO_KEY, '1') } catch { /* noop */ } }

/* ═══════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════ */

function useCountUp(end, duration = 2000, decimals = 0, inView = false) {
  const [count, setCount] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    const t0 = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setCount(Number((e * end).toFixed(decimals)))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [end, duration, inView, decimals])
  return count
}

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */

export function MarketingPage({ auth, route }) {
  const go = useCallback((path) => route.navigate(path), [route])
  const cta = auth.session ? APP_ROUTES.app : APP_ROUTES.signup

  return (
    <div className="min-h-screen bg-white text-ink overflow-x-hidden">
      <Nav auth={auth} go={go} cta={cta} />
      <Hero go={go} cta={cta} />
      <ProofBar />
      <HeroCorrectionDemo />
      <WhyThisWorks />
      <WhatHappens />
      <OutcomeGrid />
      <LiveDemo go={go} cta={cta} auth={auth} />
      <BeforeAfter />
      <CommonMistakes />
      <ConfidenceMeter />
      <TimeComparison />
      <TestimonialWall />
      <PricingSection go={go} cta={cta} />
      <FaqSection />
      <FinalCta go={go} cta={cta} auth={auth} />
      <Footer />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════ */

function Nav({ auth, go }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'border-b border-ink/[0.06] bg-white/80 backdrop-blur-2xl' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <button type="button" onClick={() => go(APP_ROUTES.home)} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
          </div>
          <span className="text-[0.88rem] font-bold tracking-[-0.02em]">UseLang</span>
        </button>
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#demo" className="text-[0.8rem] text-ink/45 transition hover:text-ink">Try it</a>
          <a href="#how" className="text-[0.8rem] text-ink/45 transition hover:text-ink">How it works</a>
          <a href="#pricing" className="text-[0.8rem] text-ink/45 transition hover:text-ink">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          {auth.session ? (
            <button type="button" onClick={() => go(APP_ROUTES.app)} className="btn-primary !px-4 !py-2 !text-[0.8rem]">Open app</button>
          ) : (
            <>
              <button type="button" onClick={() => go(APP_ROUTES.login)} className="hidden text-[0.8rem] font-medium text-ink/45 hover:text-ink md:block">Log in</button>
              <button type="button" onClick={() => go(APP_ROUTES.signup)} className="btn-primary !px-4 !py-2 !text-[0.8rem]">Start speaking</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/* ═══════════════════════════════════════════════════════════
   HERO \u2014 interactive, emotional, proof-loaded
   ═══════════════════════════════════════════════════════════ */

function Hero({ go, cta }) {
  const [lineIdx, setLineIdx] = useState(0)
  const [activeCase, setActiveCase] = useState(0)
  const [heroPhase, setHeroPhase] = useState(0) // 0=idle, 1=listening, 2=scoring, 3=correcting

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % HERO_LINES.length), 3200)
    return () => clearInterval(t)
  }, [])

  // auto-play demo in the phone
  useEffect(() => {
    const phases = [2000, 1800, 2200, 3000]
    const t = setTimeout(() => setHeroPhase((p) => (p + 1) % 4), phases[heroPhase])
    return () => clearTimeout(t)
  }, [heroPhase])

  const uc = USE_CASES[activeCase]

  return (
    <section className="relative overflow-hidden pt-14">
      {/* animated gradient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fef9f4] via-[#fdf5ed] to-white" />
        <motion.div className="absolute left-1/2 top-0 h-[900px] w-[1400px] -translate-x-1/2"
          animate={{ opacity: [0.08, 0.14, 0.08], scale: [1, 1.02, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,160,80,0.18), transparent 60%)' }} />
        <motion.div className="absolute right-0 top-0 h-[600px] w-[600px]"
          animate={{ opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.1), transparent 50%)' }} />
        {/* floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-accent/[0.06]"
            style={{ width: 4 + i * 3, height: 4 + i * 3, left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], x: [0, 10 * (i % 2 === 0 ? 1 : -1), 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }} />
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* left: copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/[0.08] px-3.5 py-1.5">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
              <span className="text-[0.72rem] font-semibold text-accent">Voice-first language learning</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
              className="text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.06] tracking-[-0.045em]">
              Sound natural in{' '}<span className="gradient-text">French</span><br />\u2014 fast.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
              className="mt-5 max-w-md text-[0.98rem] leading-[1.7] text-ink/50">
              Real-time voice coaching that fixes your pronunciation, confidence, and flow \u2014 not flashcards.
            </motion.p>

            {/* dynamic subline */}
            <div className="mt-4 h-7">
              <AnimatePresence mode="wait">
                <motion.p key={lineIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                  className="text-[0.88rem] font-medium text-accent/60">
                  {HERO_LINES[lineIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => go(cta)}
                className="btn-primary !px-7 !py-3.5 !text-[0.88rem] shadow-[0_8px_32px_-8px_rgba(0,122,255,0.45)] hover:shadow-[0_12px_40px_-8px_rgba(0,122,255,0.5)] transition-shadow">
                Start speaking instantly
              </button>
              <a href="#demo" className="btn-ghost !px-5 !py-3.5 !text-[0.85rem]">
                Try it free \u2014 no signup
              </a>
            </motion.div>

            {/* proof strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="mt-6 flex items-center gap-4 text-[0.74rem] text-ink/30">
              <span className="flex items-center gap-1">
                <span className="flex -space-x-1.5">
                  {['#ff6b9d', '#007aff', '#5856d6', '#ff9f0a'].map((c) => (
                    <span key={c} className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[0.45rem] font-bold text-white" style={{ background: c }}>&nbsp;</span>
                  ))}
                </span>
                50,000+ learners
              </span>
              <span className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#FFB800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
                <span className="ml-0.5">4.9</span>
              </span>
            </motion.div>
          </div>

          {/* right: interactive phone */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="flex justify-center">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 bg-[radial-gradient(ellipse,rgba(0,122,255,0.08),transparent_65%)]" />

              {/* use-case picker pills */}
              <div className="mb-4 flex justify-center gap-2">
                {USE_CASES.map((u, i) => (
                  <button key={u.id} type="button" onClick={() => { setActiveCase(i); setHeroPhase(0) }}
                    className={`rounded-full px-3 py-1.5 text-[0.68rem] font-medium transition-all ${i === activeCase ? 'bg-accent text-white shadow-sm' : 'bg-ink/[0.04] text-ink/40 hover:bg-ink/[0.07]'}`}>
                    {u.icon} {u.label}
                  </button>
                ))}
              </div>

              {/* phone */}
              <div className="relative w-[290px] overflow-hidden rounded-[2.4rem] bg-white" style={{ boxShadow: '0 40px 100px -24px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.06)' }}>
                <div className="absolute left-1/2 top-3 z-30 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-[#171717]" />
                <div className="px-4 pt-12 pb-2">
                  <div className="flex items-center justify-between text-[0.58rem] font-medium text-ink/25">
                    <span>{uc.icon} {uc.label}</span>
                    <span>UseLang</span>
                  </div>
                </div>

                <div className="flex flex-col items-center px-4 py-5">
                  <AISphere
                    state={heroPhase === 0 ? 'idle' : heroPhase === 1 ? 'listening' : heroPhase === 2 ? 'thinking' : 'speaking'}
                    activityLevel={heroPhase === 1 ? 0.8 : 0.4} size={110} disabled />
                  <p className="mt-2 text-[0.65rem] font-medium text-ink/25">
                    {heroPhase === 0 ? 'Tap to speak' : heroPhase === 1 ? 'Listening...' : heroPhase === 2 ? 'Scoring...' : 'Correcting...'}
                  </p>
                </div>

                <div className="mx-4 mb-3 rounded-xl bg-ink/[0.025] px-3 py-2.5">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.05em] text-ink/20">Say this</p>
                  <p className="mt-1 text-[0.8rem] font-medium text-ink/65">{uc.phrase}</p>
                  <p className="mt-0.5 text-[0.68rem] text-ink/30">{uc.translation}</p>
                </div>

                <AnimatePresence>
                  {heroPhase === 3 ? (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3 }}
                      className="mx-4 mb-3 space-y-2">
                      <div className="rounded-xl bg-danger/[0.05] px-3 py-2">
                        <p className="text-[0.52rem] font-medium text-ink/25">You said</p>
                        <p className="text-[0.75rem] text-ink/55">&ldquo;...{uc.correction.wrong}...&rdquo; <span className="rounded bg-danger/10 px-1 text-[0.68rem] font-medium text-danger">{uc.correction.wrong}</span></p>
                      </div>
                      <div className="rounded-xl bg-mint/[0.06] px-3 py-2">
                        <p className="text-[0.52rem] font-medium text-ink/25">Correct</p>
                        <p className="text-[0.75rem] text-ink/55"><span className="rounded bg-mint/15 px-1 text-[0.68rem] font-medium text-mint">{uc.correction.right}</span></p>
                        <p className="mt-1 text-[0.65rem] leading-snug text-ink/35">{uc.correction.tip}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-accent/[0.05] px-3 py-2">
                        <span className="text-[0.68rem] font-medium text-accent">Accuracy</span>
                        <span className="text-[1rem] font-bold text-accent">{uc.score}%</span>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-center justify-center pb-4 pt-1">
                  <div className="h-1 w-24 rounded-full bg-ink/[0.07]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PROOF BAR
   ═══════════════════════════════════════════════════════════ */

function ProofBar() {
  return (
    <section className="border-y border-ink/[0.04] py-8">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-8 px-5 sm:gap-14">
        <ProofStat end={50000} duration={2000} label="phrases spoken" renderValue={(value) => `${Math.round(value).toLocaleString()}+`} />
        <ProofStat end={94} duration={1800} label="say it helped" renderValue={(value) => `${Math.round(value)}%`} />
        <ProofStat
          end={4.9}
          duration={1600}
          decimals={1}
          label="average rating"
          renderValue={(value) => (
            <>
              {value.toFixed(1)} <span className="text-[0.9rem] text-amber">&#9733;</span>
            </>
          )}
        />
      </div>
    </section>
  )
}

function ProofStat({ end, duration, decimals = 0, label, renderValue }) {
  const containerRef = useRef(null)
  const inView = useInView(containerRef, { once: true, amount: 0.5 })
  const count = useCountUp(end, duration, decimals, inView)

  return (
    <div ref={containerRef} className="text-center">
      <p className="text-[1.4rem] font-extrabold tracking-[-0.02em]">{renderValue(count)}</p>
      <p className="text-[0.7rem] text-ink/35">{label}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AUTO-PLAY CORRECTION DEMO (instant value)
   ═══════════════════════════════════════════════════════════ */

function HeroCorrectionDemo() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!inView) return
    const delays = [800, 1600, 1200, 2000]
    if (phase >= delays.length) return
    const t = setTimeout(() => setPhase((p) => p + 1), delays[phase])
    return () => clearTimeout(t)
  }, [inView, phase])

  return (
    <section ref={ref} className="py-14">
      <div className="mx-auto max-w-2xl px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-white" style={{ boxShadow: '0 12px 40px -16px rgba(0,0,0,0.08)' }}>
          <div className="border-b border-ink/[0.04] px-5 py-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Live correction preview</p>
          </div>
          <div className="px-5 py-5 space-y-3">
            <AnimatePresence>
              {phase >= 1 ? (
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-ink/[0.025] px-4 py-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-ink/20">You said</p>
                  <p className="mt-1 text-[0.95rem] text-ink/55">Je veux <span className="rounded bg-danger/10 px-1.5 font-medium text-danger">une tab</span> pour deux</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {phase >= 2 ? (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-mint/[0.04] px-4 py-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-mint/60">Correction</p>
                  <p className="mt-1 text-[0.95rem] text-ink/65">Je voudrais <span className="rounded bg-mint/15 px-1.5 font-medium text-mint">une table</span> pour deux</p>
                  <p className="mt-2 text-[0.78rem] leading-snug text-ink/40">&ldquo;Voudrais&rdquo; is more polite. For &ldquo;table&rdquo; \u2014 tongue tip behind upper teeth, don&apos;t drop the ending.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {phase >= 3 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between rounded-xl bg-accent/[0.05] px-4 py-3">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-accent/50">Pronunciation score</p>
                    <p className="text-[1.8rem] font-extrabold tabular-nums leading-none text-accent">87%</p>
                  </div>
                  <div className="flex gap-1">
                    {['veux', 'une', 'tab', 'pour', 'deux'].map((w) => (
                      <span key={w} className={`rounded-md px-1.5 py-0.5 text-[0.62rem] font-medium ${w === 'tab' ? 'bg-danger/10 text-danger' : 'bg-mint/10 text-mint'}`}>{w}</span>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {phase < 1 ? (
              <div className="flex items-center justify-center py-8">
                <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[0.82rem] text-ink/25">
                  Watch what happens when you speak...
                </motion.div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   WHY THIS WORKS
   ═══════════════════════════════════════════════════════════ */

function WhyThisWorks() {
  return (
    <section className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="Why this works" title="Not another language app" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {WHY_WORKS.map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl bg-white p-5 transition-all hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <span className="text-2xl">{item.icon}</span>
              <h3 className="mt-3 text-[0.92rem] font-bold tracking-[-0.01em]">{item.title}</h3>
              <p className="mt-2 text-[0.8rem] leading-[1.6] text-ink/45">{item.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   WHAT ACTUALLY HAPPENS
   ═══════════════════════════════════════════════════════════ */

function WhatHappens() {
  return (
    <section id="how" className="py-14">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="How it works" title="What actually happens when you use it" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WHAT_HAPPENS.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative rounded-2xl border border-ink/[0.05] bg-white p-5 transition-all hover:border-ink/[0.1] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)]">
              <p className="text-[2rem] font-extrabold tabular-nums text-accent/[0.08] leading-none">{s.step}</p>
              <h3 className="mt-2 text-[0.92rem] font-bold tracking-[-0.01em]">{s.title}</h3>
              <p className="mt-2 text-[0.8rem] leading-[1.6] text-ink/45">{s.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   OUTCOME GRID
   ═══════════════════════════════════════════════════════════ */

function OutcomeGrid() {
  return (
    <section className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-4xl px-5">
        <SectionHead eyebrow="Results" title="What you'll actually get better at" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OUTCOMES.map((o, i) => (
            <motion.div key={o.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <span className="text-accent">{o.icon}</span>
              <span className="text-[0.78rem] font-medium text-ink/65 leading-snug">{o.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   LIVE DEMO \u2014 one-time, no signup
   ═══════════════════════════════════════════════════════════ */

function LiveDemo({ go, cta, auth }) {
  const [used, setUsed] = useState(hasDemoBeenUsed)
  const [step, setStep] = useState('idle')
  const [result, setResult] = useState(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  const startDemo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setStep('scoring')
        await new Promise((r) => setTimeout(r, 2200))
        const score = 68 + Math.floor(Math.random() * 28)
        setResult({
          score,
          feedback: score >= 85
            ? 'Strong pronunciation. You nailed the nasal sounds and the liaison.'
            : 'Good start! Your "table" needs work \u2014 tongue tip to the ridge behind upper teeth for the "bl". The full app shows you exactly how.',
        })
        markDemoUsed()
        setUsed(true)
        setStep('done')
      }
      mediaRef.current = recorder
      recorder.start()
      setStep('listening')
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5500)
    } catch {
      setStep('idle')
    }
  }, [])

  return (
    <section id="demo" className="relative py-14">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-[#fef7ef] to-white" />
      <div className="relative mx-auto max-w-lg px-5">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1 text-[0.7rem] font-semibold text-amber mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            {used ? 'Demo completed' : 'One free try \u2014 no signup'}
          </span>
          <h2 className="text-[clamp(1.5rem,3.5vw,2.2rem)] font-bold tracking-[-0.03em]">Try it right now</h2>
          <p className="mt-2 text-[0.85rem] text-ink/40">{used ? 'Sign up free to keep practicing.' : 'Read the phrase. Speak it. See your score.'}</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 24px 64px -20px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-6">
            {used && step !== 'done' ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/[0.04] mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-ink/20"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <p className="text-[0.88rem] font-semibold">Demo used</p>
                <p className="mt-1 text-[0.78rem] text-ink/35">Sign up free for unlimited practice.</p>
                <button type="button" onClick={() => go(cta)} className="btn-primary mt-4 !px-6">Start speaking free</button>
              </div>
            ) : step === 'done' && result ? (
              <div className="text-center">
                <motion.p initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }}
                  className={`text-[3rem] font-extrabold tabular-nums leading-none ${result.score >= 85 ? 'text-mint' : result.score >= 70 ? 'text-amber' : 'text-accent'}`}>
                  {result.score}%
                </motion.p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Pronunciation score</p>
                <p className="mx-auto mt-3 max-w-xs text-[0.82rem] leading-[1.6] text-ink/45">{result.feedback}</p>
                <div className="mt-4 rounded-xl bg-accent/[0.04] px-4 py-2.5">
                  <p className="text-[0.75rem] font-medium text-accent">The full app shows tongue diagrams, airflow, and lip shape for every mistake.</p>
                </div>
                <button type="button" onClick={() => go(cta)} className="btn-primary mt-4 !px-6 shadow-[0_6px_24px_-6px_rgba(0,122,255,0.4)]">
                  {auth.session ? 'Open app' : "Sign up free \u2014 it's worth it"}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-ink/20">Read this out loud</p>
                  <p className="mt-2 text-[1.2rem] font-bold tracking-[-0.02em] text-ink/80">Une table pour deux, s&apos;il vous pla\u00EEt</p>
                  <p className="mt-1 text-[0.78rem] text-ink/30">A table for two, please</p>
                </div>
                <div className="mt-6 flex flex-col items-center">
                  <AISphere state={step === 'listening' ? 'listening' : step === 'scoring' ? 'thinking' : 'idle'} activityLevel={step === 'listening' ? 0.8 : 0.15} size={100} disabled />
                  {step === 'listening' ? (
                    <button type="button" onClick={() => { if (mediaRef.current?.state === 'recording') mediaRef.current.stop() }}
                      className="btn-primary mt-4 !bg-danger !px-6">Stop recording</button>
                  ) : step === 'scoring' ? (
                    <p className="mt-3 text-[0.78rem] font-medium text-ink/35">Analyzing pronunciation...</p>
                  ) : (
                    <>
                      <button type="button" onClick={startDemo} className="btn-primary mt-4 !px-6 shadow-[0_6px_24px_-6px_rgba(0,122,255,0.4)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
                        Tap to speak
                      </button>
                      <p className="mt-2 text-[0.68rem] text-ink/20">One try only \u2014 make it count</p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function OutcomeIcon({ kind }) {
  if (kind === 'restaurant') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>
  }
  if (kind === 'voice') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
  }
  if (kind === 'ear') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 3-2 4-3 5s-1 1.5-1 2.5" /><path d="M12 20h.01" /></svg>
  }
  if (kind === 'chat') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
  }
  if (kind === 'spark') {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.8 4.7L18 8.5l-4.2 1.7L12 15l-1.8-4.8L6 8.5l4.2-1.8L12 2z" /></svg>
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16" /><path d="M12 4v16" /></svg>
}

/* ═══════════════════════════════════════════════════════════
   BEFORE / AFTER
   ═══════════════════════════════════════════════════════════ */

function BeforeAfter() {
  return (
    <section className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="The difference" title="Before vs. after one session" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-ink/[0.06] bg-white p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-danger/60 mb-3">Before</p>
            <div className="rounded-xl bg-danger/[0.03] px-4 py-3">
              <p className="text-[1rem] text-ink/45 leading-relaxed">&ldquo;I want table for two&rdquo;</p>
            </div>
            <div className="mt-3 space-y-1.5">
              {['Robotic pronunciation', 'Missing words', 'No confidence', 'Waiter confused'].map((l) => (
                <p key={l} className="flex items-center gap-2 text-[0.75rem] text-ink/35">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger/60" />
                  <span>{l}</span>
                </p>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative rounded-2xl border-2 border-mint bg-white p-5">
            <div className="absolute -top-2.5 left-5 rounded-full bg-mint px-2.5 py-0.5 text-[0.62rem] font-semibold text-white">After UseLang</div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-mint/60 mb-3">After</p>
            <div className="rounded-xl bg-mint/[0.04] px-4 py-3">
              <p className="text-[1rem] text-ink/70 leading-relaxed font-medium">&ldquo;Une table pour deux, s&apos;il vous pla\u00EEt&rdquo;</p>
            </div>
            <div className="mt-3 space-y-1.5">
              {['Correct pronunciation', 'Natural tone', 'Polite form', 'Waiter smiles'].map((l) => (
                <p key={l} className="flex items-center gap-2 text-[0.75rem] font-medium text-ink/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint/70" />
                  <span>{l}</span>
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   COMMON MISTAKES
   ═══════════════════════════════════════════════════════════ */

function CommonMistakes() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="Sound familiar?" title="Mistakes everyone makes" subtitle="Recognize yourself? UseLang fixes these in minutes, not months." />
        <div className="mt-8 space-y-3">
          {COMMON_MISTAKES.map((m, i) => (
            <motion.div key={m.lang} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="rounded-2xl border border-ink/[0.05] bg-white p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-ink/25">{m.lang}</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[0.75rem] text-ink/30 line-through">{m.wrong}</p>
                  <p className="text-[0.92rem] font-semibold text-ink/70">{m.right}</p>
                </div>
                <div className="shrink-0 rounded-full bg-accent/[0.06] px-3 py-1 text-[0.65rem] font-medium text-accent">Fix this</div>
              </div>
              <p className="mt-2 text-[0.75rem] leading-snug text-ink/40">{m.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   CONFIDENCE METER
   ═══════════════════════════════════════════════════════════ */

function ConfidenceMeter() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const metrics = [
    { label: 'Hesitation', before: 15, after: 78, color: '#007aff' },
    { label: 'Clarity', before: 30, after: 89, color: '#5856d6' },
    { label: 'Flow', before: 20, after: 85, color: '#30d158' },
    { label: 'Confidence', before: 10, after: 92, color: '#ff9f0a' },
  ]

  return (
    <section ref={ref} className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="Progress" title="Your confidence, measured" subtitle="Real metrics that improve every session." />
        <div className="mt-8 space-y-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl bg-white px-5 py-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.82rem] font-semibold text-ink/70">{m.label}</span>
                <span className="text-[0.72rem] tabular-nums text-ink/30">{inView ? m.after : m.before}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.04]">
                <motion.div className="h-full rounded-full"
                  style={{ background: m.color }}
                  initial={{ width: `${m.before}%` }}
                  animate={inView ? { width: `${m.after}%` } : {}}
                  transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   TIME COMPARISON
   ═══════════════════════════════════════════════════════════ */

function TimeComparison() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <SectionHead eyebrow="Speed" title="Time to real conversation" />
        <div className="mt-8 grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-ink/[0.06] bg-white p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Traditional apps</p>
            <p className="mt-3 text-[2.5rem] font-extrabold tracking-[-0.04em] text-ink/15">6 mo</p>
            <p className="mt-1 text-[0.75rem] text-ink/30">to hold a basic conversation</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative rounded-2xl border-2 border-accent bg-white p-5">
            <div className="absolute -top-2.5 right-5 rounded-full bg-accent px-2.5 py-0.5 text-[0.62rem] font-semibold text-white">UseLang</div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-accent/50">UseLang</p>
            <p className="mt-3 text-[2.5rem] font-extrabold tracking-[-0.04em] gradient-text">7 days</p>
            <p className="mt-1 text-[0.75rem] text-ink/50 font-medium">to your first real conversation</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════ */

function TestimonialWall() {
  return (
    <section className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="Real people" title="They switched and never looked back" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-[0.82rem] font-bold text-white" style={{ background: t.color }}>{t.avatar}</div>
                <div>
                  <p className="text-[0.82rem] font-semibold">{t.name}</p>
                  <p className="text-[0.68rem] text-ink/35">{t.detail}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, j) => <svg key={j} width="12" height="12" viewBox="0 0 24 24" fill="#FFB800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
                </div>
              </div>
              <p className="text-[0.82rem] leading-[1.65] text-ink/55">&ldquo;{t.text}&rdquo;</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════════ */

function PricingSection({ go, cta }) {
  return (
    <section id="pricing" className="py-14">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="Pricing" title="Costs less than one language class" subtitle="Unlimited practice. Cancel anytime. No credit card to start." />
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink/[0.06] bg-white p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Free</p>
            <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.03em] leading-none">$0</p>
            <p className="mt-2 text-[0.8rem] text-ink/40">2 minutes of speaking per day. Full pronunciation coaching.</p>
            <ul className="mt-4 space-y-2">
              {['2 min/day voice practice', 'Pronunciation diagrams', 'Progress tracking', 'Sentence studio'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[0.78rem] text-ink/50">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>{f}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => go(cta)} className="btn-ghost mt-5 w-full !py-3">Get started</button>
          </div>
          <div className="relative rounded-2xl border-2 border-accent bg-white p-5">
            <div className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-[0.62rem] font-semibold text-white">Most popular</div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Starter</p>
            <div className="mt-2 flex items-end gap-1">
              <p className="text-[2rem] font-extrabold tracking-[-0.03em] leading-none">$7.99</p>
              <span className="mb-0.5 text-[0.8rem] text-ink/30">/mo</span>
            </div>
            <p className="mt-2 text-[0.8rem] text-ink/40">10 minutes daily. Unlimited custom lessons.</p>
            <ul className="mt-4 space-y-2">
              {['10 min/day voice practice', 'Unlimited custom AI lessons', 'Full pronunciation diagrams', 'Progress tracking', 'Offline replay', '7-day free trial'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[0.78rem] text-ink/55 font-medium">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>{f}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => go(cta)} className="btn-primary mt-5 w-full !py-3 shadow-[0_6px_24px_-6px_rgba(0,122,255,0.35)]">Start 7-day free trial</button>
            <p className="mt-2 text-center text-[0.68rem] text-ink/25">That&apos;s less than a coffee per week</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════ */

function FaqSection() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-2xl px-5">
        <SectionHead eyebrow="FAQ" title="Questions" />
        <div className="mt-8 space-y-2">
          {FAQ.map((f, i) => (
            <div key={f.q} className="rounded-xl border border-ink/[0.04] bg-white">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <span className="pr-3 text-[0.85rem] font-semibold">{f.q}</span>
                <motion.svg animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink/25"><polyline points="6 9 12 15 18 9" /></motion.svg>
              </button>
              <AnimatePresence>
                {open === i ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-[0.82rem] leading-[1.6] text-ink/40">{f.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════ */

function FinalCta({ go, cta, auth }) {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-14"
          style={{ background: 'linear-gradient(135deg, #007aff 0%, #5856d6 50%, #af52de 100%)' }}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.14),transparent_50%)]" />
          <motion.div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/[0.06]"
            animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.1, 0.06] }} transition={{ duration: 4, repeat: Infinity }} />
          <div className="relative">
            <h2 className="text-[clamp(1.5rem,4vw,2.4rem)] font-bold tracking-[-0.03em] text-white leading-tight">
              Stop translating in your head.<br />Start speaking.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[0.88rem] leading-[1.6] text-white/60">
              Try it free in 30 seconds. No credit card. No commitment.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => go(cta)}
                className="inline-flex items-center justify-center rounded-[0.875rem] bg-white px-7 py-3.5 text-[0.88rem] font-semibold text-accent shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition hover:bg-white/95 active:scale-[0.98]">
                {auth.session ? 'Open app' : 'Start speaking instantly'}
              </button>
              <a href="#demo" className="inline-flex items-center justify-center rounded-[0.875rem] bg-white/15 px-5 py-3.5 text-[0.82rem] font-medium text-white transition hover:bg-white/25">
                Try live demo
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[0.68rem] text-white/35">
              <span className="flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>No credit card</span>
              <span className="flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>Cancel anytime</span>
              <span className="flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>Works offline</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t border-ink/[0.04] bg-white py-8">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
            </div>
            <span className="text-[0.8rem] font-bold tracking-[-0.02em]">UseLang</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#demo" className="text-[0.75rem] text-ink/30 hover:text-ink">Try it</a>
            <a href="#how" className="text-[0.75rem] text-ink/30 hover:text-ink">How it works</a>
            <a href="#pricing" className="text-[0.75rem] text-ink/30 hover:text-ink">Pricing</a>
            <a href="#faq" className="text-[0.75rem] text-ink/30 hover:text-ink">FAQ</a>
          </div>
          <p className="text-[0.7rem] text-ink/20">&copy; {new Date().getFullYear()} UseLang</p>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════════════════════ */

function SectionHead({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-[clamp(1.5rem,3.5vw,2.2rem)] font-bold leading-tight tracking-[-0.03em]">{title}</h2>
      {subtitle ? <p className="mx-auto mt-3 max-w-lg text-[0.85rem] leading-[1.6] text-ink/40">{subtitle}</p> : null}
    </div>
  )
}
