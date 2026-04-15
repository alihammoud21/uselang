import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'
import { MarketingNav, MarketingFooter } from '@/pages/MarketingShared'
import { WisprHero, VideoShowcaseStrip, EditorialSplit } from '@/pages/marketing/MarketingWispr'

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const USE_CASES = [
  {
    id: 'restaurant',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>,
    label: 'Restaurant',
    phrase: "Une table pour deux, s'il vous pla\u00EEt",
    translation: 'A table for two, please',
    correction: { wrong: 'tab', right: 'table', tip: "Tongue tip behind upper teeth for the \"bl\". Don't swallow the ending." },
    score: 87,
  },
  {
    id: 'travel',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>,
    label: 'Travel',
    phrase: 'O\u00F9 est la station de m\u00E9tro ?',
    translation: 'Where is the metro station?',
    correction: { wrong: 'sta-see-on', right: 'sta-syon', tip: 'French "tion" = "syon". Lips forward, nasal ending.' },
    score: 72,
  },
  {
    id: 'smalltalk',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    label: 'Small talk',
    phrase: "Enchant\u00E9, je m'appelle\u2026",
    translation: 'Nice to meet you, my name is...',
    correction: { wrong: 'en-chan-tay', right: '\u00E3\u0283\u0251\u0303te', tip: 'Nasal "\u00E3" means air through nose, not "en". Round lips slightly.' },
    score: 91,
  },
]

const WHY_WORKS = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>, title: 'Speak immediately', detail: 'No tapping words. No matching pictures. You open your mouth from second one.' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" /><path d="M9.5 14.5L7 22l5-3 5 3-2.5-7.5" /><path d="M6 10a6 6 0 0012 0" /></svg>, title: 'AI corrects you live', detail: 'Word-level scoring with tongue placement, lip shape, and airflow. Not just "try again".' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>, title: 'Real-life scenarios only', detail: 'You tell the AI what you need. It builds a custom session. No preset lesson trees.' },
]

const WHAT_HAPPENS = [
  { step: '01', title: 'You say what you need', detail: '"I want to order food in French." The AI understands and starts building.' },
  { step: '02', title: 'AI builds a real scenario', detail: '4 phrases, estimated time, difficulty level. Personalized to your level.' },
  { step: '03', title: 'You speak + get corrected instantly', detail: 'Every word scored. Tongue diagrams for mistakes. Replay at any speed.' },
]

const OUTCOMES = [
  { label: 'Ordering food without hesitation', kind: 'restaurant' },
  { label: 'Sounding natural, not robotic', kind: 'voice' },
  { label: 'Understanding fast speakers', kind: 'ear' },
  { label: 'Having real conversations', kind: 'chat' },
  { label: 'Handling unexpected situations', kind: 'spark' },
  { label: 'Feeling confident, not anxious', kind: 'growth' },
]

const COMMON_MISTAKES = [
  { wrong: 'Merci bo-coo', right: 'M\u025B\u0281si boku', lang: 'French', note: 'The "r" is in the throat, not the mouth. The "eau" is a pure "o".' },
  { wrong: 'Gra-see-as', right: '\u02C8\u0261\u027Ea.sjas', lang: 'Spanish', note: 'Soft "r" means the tongue taps once. "Cias" is one syllable, not two.' },
  { wrong: 'Shukran', right: '\u0283uk.ran', lang: 'Arabic', note: 'The "\u0634" is a deep "sh". Tongue pulled back, not forward like English.' },
]

const BEFORE_WAVE_BARS = [3, 6, 4, 8, 5, 9, 4, 7, 5, 3, 6, 9, 5, 7, 4, 8, 6, 3, 5, 9, 4, 7, 5, 8, 4, 6, 3, 7, 5, 8, 4, 6, 3, 7, 5, 9, 4, 8, 5, 6, 4, 7, 3, 8, 5, 6, 4, 7, 5, 3]

const TESTIMONIALS = [
  { name: 'Sarah K.', detail: 'Learning French \u00B7 3 months', text: 'Duolingo taught me to tap words. UseLang taught me to actually say them. My Airbnb host in Paris understood me on the first try.', avatar: 'S', color: '#ff6b9d' },
  { name: 'Marco T.', detail: 'Learning Spanish \u00B7 6 weeks', text: 'The tongue placement diagrams made the Spanish R click after years of struggling. My wife is from Madrid and she noticed day one.', avatar: 'M', color: '#c9a97a' },
  { name: 'Yuki A.', detail: 'Learning English \u00B7 2 months', text: 'I got compliments on my pronunciation at work for the first time. The corrections are specific, not just "try again".', avatar: 'Y', color: '#5856d6' },
  { name: 'David R.', detail: 'Learning Arabic \u00B7 1 month', text: 'Finally something that teaches the sounds, not just the words. Arabic pronunciation clicked after one session.', avatar: 'D', color: '#ff9f0a' },
]

const FAQ = [
  { q: 'How is this different from Duolingo?', a: 'Duolingo teaches you to read and tap. UseLang teaches you to speak. You open your mouth from second one, and the AI corrects every word with actual pronunciation technique: tongue placement, lip shape, airflow.', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg> },
  { q: 'Do I need to download anything?', a: "No. UseLang works in your browser and installs to your home screen like a native app. Zero friction. We're also preparing for the App Store.", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
  { q: 'What does free include?', a: '2 minutes of voice practice per day with very limited AI interaction — enough to hear how it works. You get pronunciation diagrams and progress tracking. Upgrade to Starter for 15 min/day, the full translator, voice accent selection, and offline lesson downloads.', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
  { q: 'What languages are supported?', a: 'French, Spanish, Arabic, Chinese (Mandarin), English, and Italian. Each language has tailored pronunciation guidance with accent-specific coaching.', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg> },
  { q: 'Can I prepare for a trip?', a: 'That\'s exactly what it\'s for. Say "I\'m going to Paris next week" and the AI builds practice for ordering food, getting directions, checking into hotels.', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg> },
  { q: 'How fast will I see results?', a: 'Most users report noticeable improvement in pronunciation within the first session. Real conversational confidence typically develops within 1-2 weeks of daily practice.', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
]

const CONVO_LINES = [
  { role: 'ai', text: 'Bonjour ! Vous avez une r\u00E9servation ?' },
  { role: 'user', text: 'Oui, au nom de Martin.' },
  { role: 'ai', text: 'Tr\u00E8s bien. Pour combien de personnes ?' },
  { role: 'user', text: 'Pour deux, s\'il vous pla\u00EEt.' },
  { role: 'ai', text: 'Parfait. Suivez-moi, votre table est pr\u00EAte.' },
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
    <div className="min-h-screen bg-[#faf8f5] text-ink overflow-x-hidden">
      <MarketingNav auth={auth} go={go} />
      <WisprHero go={go} cta={cta} />
      <VideoShowcaseStrip />
      <ProofBar />
      <EditorialSplit go={go} cta={cta} />
      <HeroCorrectionDemo />
      <WhyThisWorks />
      <WhatHappens />
      <OutcomeGrid />
      <ConversationSimulator go={go} cta={cta} />
      <LiveDemo go={go} cta={cta} auth={auth} />
      <BeforeAfter />
      <CommonMistakes />
      <PronunciationChallenge go={go} cta={cta} />
      <ConfidenceMeter />
      <TimeComparison />
      <TestimonialWall />
      <PricingSection go={go} cta={cta} auth={auth} />
      <FaqSection />
      <FinalCta go={go} cta={cta} auth={auth} />
      <MarketingFooter go={go} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PROOF BAR
   ═══════════════════════════════════════════════════════════ */

function ProofBar() {
  return (
    <section className="border-y border-stone-200/50 py-12 bg-[#f3eee6]/60">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-8 px-5 lg:justify-between lg:px-10">
        <ProofStat end={50000} duration={2000} label="phrases spoken"
          renderValue={(v) => `${Math.round(v).toLocaleString()}+`}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>} />
        <div className="hidden h-8 w-px bg-ink/[0.06] sm:block" />
        <ProofStat end={94} duration={1800} label="say it helped"
          renderValue={(v) => `${Math.round(v)}%`}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-[#5856d6]"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
        <div className="hidden h-8 w-px bg-ink/[0.06] sm:block" />
        <ProofStat end={4.9} duration={1600} decimals={1} label="average rating"
          renderValue={(v) => <>{v.toFixed(1)} <span className="text-[0.9rem] text-amber">&#9733;</span></>}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-amber"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
      </div>
    </section>
  )
}

function ProofStat({ end, duration, decimals = 0, label, renderValue, icon }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const count = useCountUp(end, duration, decimals, inView)
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
        {icon}
      </div>
      <div>
        <p className="text-[1.2rem] font-extrabold tracking-[-0.02em] leading-none">{renderValue(count)}</p>
        <p className="mt-0.5 text-[0.65rem] text-ink/35">{label}</p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AUTO-PLAY CORRECTION DEMO
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
          <div className="flex items-center justify-between border-b border-ink/[0.04] px-5 py-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Live correction preview</p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger/60" />
              <span className="h-2 w-2 rounded-full bg-amber/60" />
              <span className="h-2 w-2 rounded-full bg-mint/60" />
            </div>
          </div>
          <div className="px-5 py-5 space-y-3">
            <AnimatePresence>
              {phase >= 1 ? (
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-ink/[0.025] px-4 py-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-ink/20">You said</p>
                  <p className="mt-1 text-[0.95rem] text-ink/55">Je veux <span className="rounded bg-danger/10 px-1.5 font-medium text-danger">une tab</span> pour deux</p>
                  {/* waveform visualization */}
                  <div className="mt-2 flex items-center gap-[2px]">
                    {[...Array(40)].map((_, i) => (
                      <motion.div key={i} className="rounded-full bg-danger/20" style={{ width: 2 }}
                        initial={{ height: 3 }}
                        animate={phase >= 1 ? { height: [3, 4 + Math.sin(i * 0.5) * 12, 3] } : {}}
                        transition={{ duration: 0.8, delay: i * 0.02, ease: 'easeOut' }} />
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {phase >= 2 ? (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-mint/[0.04] px-4 py-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-mint/60">Correction</p>
                  <p className="mt-1 text-[0.95rem] text-ink/65">Je voudrais <span className="rounded bg-mint/15 px-1.5 font-medium text-mint">une table</span> pour deux</p>
                  <p className="mt-2 text-[0.78rem] leading-snug text-ink/40">&ldquo;Voudrais&rdquo; is more polite. For &ldquo;table&rdquo;, tongue tip behind upper teeth. Don&apos;t drop the ending.</p>
                  {/* tongue diagram hint */}
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent/[0.04] px-3 py-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent/50"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    <span className="text-[0.68rem] text-accent/60">Tongue diagram available in full app</span>
                  </div>
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
                <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-2 text-[0.82rem] text-ink/25">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
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
    <section className="relative py-16 overflow-hidden bg-[#f7f4f0]">
      <div className="relative mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="Why this works" title="Not another language app" subtitle="Stop wasting time on apps that teach you to tap buttons. This one teaches you to actually speak." />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {WHY_WORKS.map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-2xl bg-white p-5 border border-ink/[0.05] transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/[0.08] text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                {item.icon}
              </div>
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
    <section id="how-it-works" className="py-20" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #ffffff 100%)' }}>
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="How it works" title="3 steps. That's it." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {WHAT_HAPPENS.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative rounded-[1.6rem] bg-white p-7 text-center"
              style={{ boxShadow: '0 2px 12px -4px rgba(201,169,122,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
              <div
                className="relative mx-auto flex h-13 w-13 items-center justify-center rounded-[1rem] text-[1rem] font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #c9a97a 0%, #a07c52 100%)', boxShadow: '0 6px 20px -4px rgba(201,169,122,0.36)' }}
              >
                {s.step}
              </div>
              <h3 className="mt-4 text-[0.95rem] font-bold tracking-[-0.01em]">{s.title}</h3>
              <p className="mt-2 text-[0.8rem] leading-[1.6] text-ink/42">{s.detail}</p>
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
    <section className="py-16 bg-gradient-to-b from-[#faf8f5] to-white">
      <div className="mx-auto max-w-4xl px-5">
        <SectionHead eyebrow="Results" title="What you'll actually be able to do" subtitle="Not theoretical knowledge. Real skills you'll use tomorrow." />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OUTCOMES.map((o, i) => (
            <motion.div key={o.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group flex items-center gap-3 rounded-xl border border-ink/[0.04] bg-white px-4 py-4 transition-all hover:border-accent/20 hover:shadow-[0_4px_20px_-4px_rgba(201,169,122,0.1)] hover:-translate-y-0.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/[0.06] text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <OutcomeIcon kind={o.kind} />
              </div>
              <span className="text-[0.78rem] font-medium text-ink/65 leading-snug">{o.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   CONVERSATION SIMULATOR
   ═══════════════════════════════════════════════════════════ */

function ConversationSimulator({ go, cta }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (visibleLines >= CONVO_LINES.length) return
    const t = setTimeout(() => setVisibleLines((v) => v + 1), visibleLines === 0 ? 600 : 1400)
    return () => clearTimeout(t)
  }, [inView, visibleLines])

  return (
    <section ref={ref} className="py-14">
      <div className="mx-auto max-w-2xl px-5">
        <SectionHead eyebrow="Killer feature" title="Real conversation simulator"
          subtitle="The AI plays the waiter, the taxi driver, or the shopkeeper. You respond. It adapts. Like real life." />
        <div className="mt-8 overflow-hidden rounded-2xl border border-ink/[0.06] bg-white" style={{ boxShadow: '0 16px 48px -16px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 border-b border-ink/[0.04] px-5 py-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-accent"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            <p className="text-[0.68rem] font-semibold text-ink/40">Restaurant scenario</p>
            <div className="ml-auto flex items-center gap-1">
              <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[0.6rem] font-medium text-mint">Live</span>
            </div>
          </div>

          <div className="px-5 py-5 space-y-3 min-h-[280px]">
            {CONVO_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10, x: line.role === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.35 }}
                className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  line.role === 'ai'
                    ? 'bg-ink/[0.03] text-ink/65'
                    : 'bg-accent text-white'
                }`}>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.04em] mb-1" style={{ opacity: 0.5 }}>
                    {line.role === 'ai' ? 'AI Waiter' : 'You'}
                  </p>
                  <p className="text-[0.88rem] leading-snug">{line.text}</p>
                </div>
              </motion.div>
            ))}

            {visibleLines > 0 && visibleLines < CONVO_LINES.length ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex ${CONVO_LINES[visibleLines].role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-center gap-1 rounded-2xl bg-ink/[0.03] px-4 py-3">
                  <motion.span animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                  <motion.span animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                  <motion.span animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                </div>
              </motion.div>
            ) : null}

            {visibleLines >= CONVO_LINES.length ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-mint/10 px-3 py-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span className="text-[0.72rem] font-semibold text-mint">Conversation completed</span>
                </div>
                <p className="mt-3 text-[0.78rem] text-ink/35">This is what real practice looks like. No textbooks.</p>
                <button type="button" onClick={() => go(cta)} className="btn-primary mt-3 !px-5 !py-2 !text-[0.78rem]">Try a conversation</button>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   LIVE DEMO - one-time, no signup
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
            : 'Good start! Your "table" needs work. Tongue tip to the ridge behind upper teeth for the "bl". The full app shows you exactly how.',
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
            {used ? 'Demo completed' : 'One free try, no signup'}
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
                <button type="button" onClick={() => go(cta)} className="btn-primary mt-4 !px-6 shadow-[0_6px_24px_-6px_rgba(201,169,122,0.4)]">
                  {auth.session ? 'Open app' : "Sign up free. It's worth it."}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.05em] text-ink/20">Read this out loud</p>
                  <p className="mt-2 text-[1.2rem] font-bold tracking-[-0.02em] text-ink/80">Une table pour deux, s&apos;il vous pla&icirc;t</p>
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
                      <button type="button" onClick={startDemo}
                        className="btn-primary mt-4 !px-6 shadow-[0_6px_24px_-6px_rgba(201,169,122,0.4)] flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
                        Tap to speak
                      </button>
                      <p className="mt-2 text-[0.68rem] text-ink/20">One try only. Make it count.</p>
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

/* ═══════════════════════════════════════════════════════════
   BEFORE / AFTER
   ═══════════════════════════════════════════════════════════ */

function BeforeAfter() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <section ref={ref} className="py-14 bg-[#fafbfd]">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="The difference" title="Before vs. after one session" subtitle="This is what 10 minutes of practice actually sounds like." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-ink/[0.06] bg-white p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-danger/60 mb-3">Before</p>
            <div className="rounded-xl bg-danger/[0.03] px-4 py-3">
              <p className="text-[1rem] text-ink/45 leading-relaxed">&ldquo;I want table for two&rdquo;</p>
            </div>
            {/* fake waveform */}
            <div className="mt-3 flex items-center gap-[2px] px-1">
              {[...Array(50)].map((_, i) => (
                <motion.div key={i} className="rounded-full bg-danger/15" style={{ width: 2 }}
                  initial={{ height: 2 }}
                  animate={inView ? { height: BEFORE_WAVE_BARS[i] } : {}}
                  transition={{ duration: 0.6, delay: i * 0.01 }} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {['Robotic pronunciation', 'Missing words', 'No confidence', 'Waiter confused'].map((l) => (
                <p key={l} className="flex items-center gap-2 text-[0.75rem] text-ink/35">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-danger/50"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
              <p className="text-[1rem] text-ink/70 leading-relaxed font-medium">&ldquo;Une table pour deux, s&apos;il vous pla&icirc;t&rdquo;</p>
            </div>
            {/* smooth waveform */}
            <div className="mt-3 flex items-center gap-[2px] px-1">
              {[...Array(50)].map((_, i) => (
                <motion.div key={i} className="rounded-full bg-mint/25" style={{ width: 2 }}
                  initial={{ height: 2 }}
                  animate={inView ? { height: 3 + Math.sin(i * 0.3) * 10 + 4 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.01 }} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {['Correct pronunciation', 'Natural tone', 'Polite form', 'Waiter smiles'].map((l) => (
                <p key={l} className="flex items-center gap-2 text-[0.75rem] font-medium text-ink/55">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
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
    <section className="py-16 bg-[#fafbfd]">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="Sound familiar?" title="Everyone makes these mistakes" subtitle="Recognize yourself? UseLang fixes these in minutes, not months." />
        <div className="mt-10 space-y-3">
          {COMMON_MISTAKES.map((m, i) => (
            <motion.div key={m.lang} initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-ink/[0.05] bg-white p-5 transition-all hover:border-accent/20 hover:shadow-[0_8px_32px_-8px_rgba(201,169,122,0.08)]"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-accent/0 via-accent/40 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-lg bg-gradient-to-r from-accent/[0.08] to-[#5856d6]/[0.08] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-accent/60">{m.lang}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/[0.08]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </div>
                    <p className="text-[0.82rem] text-ink/30 line-through decoration-red-300/30">{m.wrong}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#30d158]/[0.08]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p className="text-[0.95rem] font-semibold text-ink/70">{m.right}</p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="shrink-0 cursor-pointer rounded-xl bg-gradient-to-r bg-[#f5ede0] px-4 py-2 text-[0.68rem] font-semibold text-accent transition-all hover:from-accent hover:to-[#5856d6] hover:text-white hover:shadow-[0_4px_16px_-4px_rgba(201,169,122,0.3)]">
                  Fix this
                </motion.div>
              </div>
              <p className="mt-3 text-[0.75rem] leading-snug text-ink/40">{m.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PRONUNCIATION CHALLENGE - "Try to beat the AI"
   ═══════════════════════════════════════════════════════════ */

function PronunciationChallenge({ go, cta }) {
  const [started, setStarted] = useState(false)
  const [animScore, setAnimScore] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (!started) return
    let frame = 0
    const maxFrames = 60
    const target = 42 + Math.floor(Math.random() * 30)
    const tick = () => {
      frame++
      const p = Math.min(frame / maxFrames, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setAnimScore(Math.round(ease * target))
      if (frame < maxFrames) requestAnimationFrame(tick)
    }
    const timeout = setTimeout(() => requestAnimationFrame(tick), 1500)
    return () => clearTimeout(timeout)
  }, [started])

  return (
    <section ref={ref} className="relative py-16 overflow-hidden bg-[#f7f4f0]">
      <div className="relative mx-auto max-w-lg px-5">
        <SectionHead eyebrow="Challenge" title="Think you can pronounce this?"
          subtitle="Most English speakers can't. Let's see if you can beat the average score of 54%." />
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-8 overflow-hidden rounded-2xl bg-white border border-ink/[0.06]" style={{ boxShadow: '0 16px 48px -16px rgba(0,0,0,0.08)' }}>
          <div className="bg-gradient-to-r from-[#c9a97a] to-[#a07c52] px-5 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.72rem] font-semibold text-white/90">Pronunciation challenge</p>
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                <span className="text-[0.68rem] font-bold text-white">Hard</span>
              </div>
            </div>
          </div>
          <div className="px-5 py-6 text-center">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.05em] text-ink/25">Try to say this</p>
            <p className="mt-2 text-[1.3rem] font-bold tracking-[-0.02em] text-ink/75">Aujourd&apos;hui il fait tr&egrave;s beau</p>
            <p className="mt-1 text-[0.78rem] text-ink/35">Today the weather is very nice</p>

            {!started ? (
              <motion.button type="button" onClick={() => setStarted(true)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-primary mt-6 !px-6 shadow-[0_6px_24px_-6px_rgba(201,169,122,0.4)] flex items-center gap-2 mx-auto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
                Take the challenge
              </motion.button>
            ) : animScore === 0 ? (
              <div className="mt-6">
                <AISphere state="listening" activityLevel={0.8} size={80} disabled />
                <p className="mt-2 text-[0.75rem] font-medium text-accent/60">Listening...</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6">
                <p className={`text-[2.8rem] font-extrabold tabular-nums leading-none ${animScore >= 70 ? 'text-[#30d158]' : animScore >= 50 ? 'text-[#ff9f0a]' : 'text-accent'}`}>
                  {animScore}%
                </p>
                <p className="mt-1 text-[0.72rem] text-ink/30">Average score: 54%</p>
                <div className="mt-3 rounded-xl bg-accent/[0.04] px-4 py-2.5">
                  <p className="text-[0.75rem] text-ink/45">
                    {animScore >= 70
                      ? 'Impressive! The full app can push you even further.'
                      : 'The French "r" and nasal vowels are tricky. The app teaches you exactly where to put your tongue.'}
                  </p>
                </div>
                <button type="button" onClick={() => go(cta)} className="btn-primary mt-4 !px-5 !py-2.5 !text-[0.82rem]">
                  Get better at this
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
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
    { label: 'Hesitation', before: 15, after: 78, color: '#c9a97a', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: 'Clarity', before: 30, after: 89, color: '#5856d6', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
    { label: 'Flow', before: 20, after: 85, color: '#30d158', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
    { label: 'Confidence', before: 10, after: 92, color: '#ff9f0a', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l1.8 4.7L18 8.5l-4.2 1.7L12 15l-1.8-4.8L6 8.5l4.2-1.8L12 2z" /></svg> },
  ]

  return (
    <section ref={ref} className="py-16 bg-[#f7f4f0]">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead eyebrow="Scientific" title="Your confidence, measured" subtitle="Real metrics that improve every session. Not vibes. Data." />
        <div className="mt-8 space-y-3">
          {metrics.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl bg-white border border-ink/[0.05] px-5 py-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span className="text-[0.82rem] font-semibold text-ink/70">{m.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] text-ink/20">{m.before}%</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink/15"><polyline points="9 6 15 12 9 18" /></svg>
                  <span className="text-[0.72rem] font-bold tabular-nums" style={{ color: m.color }}>{inView ? m.after : m.before}%</span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.04]">
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }}
                  initial={{ width: `${m.before}%` }}
                  animate={inView ? { width: `${m.after}%` } : {}}
                  transition={{ duration: 1.5, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </motion.div>
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
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  return (
    <section ref={ref} className="py-16">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <SectionHead eyebrow="Be honest with yourself" title="How long until you can actually talk?" />
        <div className="mt-10 grid grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="group relative rounded-2xl border border-ink/[0.06] bg-white p-7 transition-all hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[0.03] mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ink/20"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            </div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink/25">Traditional apps</p>
            <motion.p className="mt-3 text-[3rem] font-extrabold tracking-[-0.04em] text-ink/12 leading-none"
              initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.6, delay: 0.2 }}>
              6 mo
            </motion.p>
            <p className="mt-2 text-[0.78rem] text-ink/30">to hold a basic conversation</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.04]">
              <motion.div className="h-full rounded-full bg-ink/10" initial={{ width: 0 }}
                animate={inView ? { width: '100%' } : {}} transition={{ duration: 2, ease: 'linear' }} />
            </div>
            <p className="mt-3 text-[0.68rem] text-ink/20 italic">...if you don&apos;t quit first</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border-2 border-accent/20 bg-white p-7"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/[0.04]" />
            <div className="mb-4 inline-flex rounded-full bg-accent px-3 py-0.5 text-[0.62rem] font-semibold text-white">UseLang</div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9a97a] to-[#a07c52] mb-4 shadow-[0_4px_16px_-4px_rgba(201,169,122,0.3)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
            </div>
            <motion.p className="mt-3 text-[3rem] font-extrabold tracking-[-0.04em] gradient-text leading-none"
              initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.6, delay: 0.4 }}>
              7 days
            </motion.p>
            <p className="mt-2 text-[0.78rem] text-ink/55 font-medium">to your first real conversation</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-accent/10">
              <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                style={{ background: 'linear-gradient(90deg, #c9a97a, #5856d6)' }}
                animate={inView ? { width: '6.5%' } : {}} transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <p className="mt-3 text-[0.68rem] text-accent/60 font-medium">Because you&apos;re actually speaking</p>
          </motion.div>
        </div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
          className="mt-6 text-[0.75rem] text-ink/25">
          Both bars represent time to first conversation. The difference is obvious.
        </motion.p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════ */

function TestimonialWall() {
  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#fafbfd] via-white to-[#fafbfd]" />
      <div className="relative mx-auto max-w-5xl px-5">
        <SectionHead eyebrow="Real people" title="They switched and never looked back" subtitle="Don't take our word for it." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative rounded-2xl bg-white p-6 border border-ink/[0.05] transition-all hover:border-accent/15 hover:shadow-[0_8px_32px_-8px_rgba(201,169,122,0.1)]"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, rgba(201,169,122,0.02), rgba(201,169,122,0.03))' }} />
              <div className="relative flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-[0.85rem] font-bold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}dd)` }}>{t.avatar}</div>
                <div>
                  <p className="text-[0.85rem] font-semibold">{t.name}</p>
                  <p className="text-[0.68rem] text-ink/35">{t.detail}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, j) => <svg key={j} width="12" height="12" viewBox="0 0 24 24" fill="#FFB800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
                </div>
              </div>
              <div className="relative">
                <svg width="20" height="16" viewBox="0 0 20 16" className="mb-2 text-accent/10"><path d="M8 0H0v8c0 4.4 3.6 8 8 8v-4c-2.2 0-4-1.8-4-4h4V0zm12 0h-8v8c0 4.4 3.6 8 8 8v-4c-2.2 0-4-1.8-4-4h4V0z" fill="currentColor" /></svg>
                <p className="text-[0.85rem] leading-[1.7] text-ink/55">{t.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PRICING — 3-tier premium with monthly/yearly toggle
   ═══════════════════════════════════════════════════════════ */

const PCHECK = ({ muted }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke={muted ? 'rgba(15,20,25,0.18)' : '#c9a97a'} strokeWidth="2.8" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/* Feature rows: null = not available, 'partial' = limited, true = full */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it today',
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: 'Get started free',
    badge: null,
    highlight: false,
    features: [
      { label: '2 min/day voice practice', note: null, avail: true },
      { label: 'AI listens & responds', note: 'Very limited', avail: 'partial' },
      { label: 'Basic pronunciation feedback', note: null, avail: true },
      { label: 'Pronunciation diagrams', note: null, avail: true },
      { label: 'Progress tracking', note: null, avail: true },
      { label: 'Built-in translator', note: null, avail: false },
      { label: 'Download lessons offline', note: null, avail: false },
      { label: 'Custom AI lessons', note: null, avail: false },
      { label: 'Voice accent selection', note: null, avail: false },
      { label: 'Voice style & speed control', note: null, avail: false },
      { label: 'Streak & goal tracking', note: null, avail: false },
      { label: 'Multi-device sync', note: null, avail: false },
      { label: 'Priority AI responses', note: null, avail: false },
      { label: 'Native speaker simulations', note: null, avail: false },
      { label: 'Conversation mode', note: null, avail: false },
      { label: 'Exam prep mode', note: null, avail: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For consistent learners',
    monthlyPrice: 7.99,
    yearlyPrice: 63.99,
    cta: 'Start 7-day free trial',
    badge: 'Most popular',
    highlight: true,
    features: [
      { label: '15 min/day voice practice', note: null, avail: true },
      { label: 'AI listens & responds', note: 'Full access', avail: true },
      { label: 'Full pronunciation coaching', note: null, avail: true },
      { label: 'Pronunciation diagrams', note: null, avail: true },
      { label: 'Progress tracking', note: null, avail: true },
      { label: 'Built-in translator', note: null, avail: true },
      { label: 'Download lessons offline', note: 'Your saved sets', avail: true },
      { label: 'Unlimited custom AI lessons', note: null, avail: true },
      { label: 'Voice accent selection', note: '5 accents per language', avail: true },
      { label: 'Voice style & speed control', note: null, avail: true },
      { label: 'Streak & goal tracking', note: null, avail: true },
      { label: 'Multi-device sync', note: null, avail: true },
      { label: 'Priority AI responses', note: null, avail: false },
      { label: 'Native speaker simulations', note: null, avail: false },
      { label: 'Conversation mode', note: null, avail: false },
      { label: 'Exam prep mode', note: null, avail: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious speakers',
    monthlyPrice: 14.99,
    yearlyPrice: 119.99,
    cta: 'Go Pro',
    badge: 'Everything included',
    highlight: false,
    features: [
      { label: '30 min/day voice practice', note: null, avail: true },
      { label: 'AI listens & responds', note: 'Full access', avail: true },
      { label: 'Full pronunciation coaching', note: null, avail: true },
      { label: 'Pronunciation diagrams', note: null, avail: true },
      { label: 'Progress tracking', note: null, avail: true },
      { label: 'Built-in translator', note: null, avail: true },
      { label: 'Full offline AI mode', note: 'All content available', avail: true },
      { label: 'Unlimited custom AI lessons', note: null, avail: true },
      { label: 'Voice accent selection', note: 'All regional accents', avail: true },
      { label: 'Voice style & speed control', note: 'Formal · casual · native speed', avail: true },
      { label: 'Streak & goal tracking', note: null, avail: true },
      { label: 'Multi-device sync', note: null, avail: true },
      { label: 'Priority AI responses', note: null, avail: true },
      { label: 'Native speaker simulations', note: null, avail: true },
      { label: 'Conversation mode', note: 'Full real-time dialogue', avail: true },
      { label: 'Exam prep mode', note: 'DELF, DELE, HSK & more', avail: true },
    ],
  },
]

/* which rows to show in collapsed view */
const PREVIEW_COUNT = 7

function PricingSection({ go, cta, auth }) {
  const [yearly, setYearly] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handlePlanCta(planId) {
    if (planId === 'free') {
      go(cta)
      return
    }
    if (!auth?.session) {
      go(APP_ROUTES.signup)
      return
    }
    await auth.updateProfile({ plan: planId })
    go(APP_ROUTES.app)
  }

  return (
    <section id="pricing" className="relative py-24 overflow-hidden" style={{ background: 'linear-gradient(180deg, #f9f7f4 0%, #ffffff 100%)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-[600px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="absolute -left-32 top-32 h-[380px] w-[380px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #c9a97a, transparent 65%)' }} />
        <div className="absolute -right-32 bottom-40 h-[300px] w-[300px] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, #5856d6, transparent 65%)' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">

        {/* ── header ── */}
        <div className="text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="eyebrow mb-3">Pricing</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
            className="text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold tracking-[-0.04em] leading-[1.1]">
            Pick your pace.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="mx-auto mt-3 max-w-md text-[0.88rem] leading-[1.65] text-ink/40">
            Costs less than a single in-person class. Cancel instantly, no hoops.
          </motion.p>
        </div>

        {/* ── billing toggle ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.14 }}
          className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-[0.8rem] font-medium transition-colors ${!yearly ? 'text-ink' : 'text-ink/30'}`}>Monthly</span>
          <button type="button" onClick={() => setYearly(!yearly)}
            className="relative h-7 w-12 rounded-full transition-colors duration-300"
            style={{ background: yearly ? '#c9a97a' : 'rgba(0,0,0,0.1)' }}>
            <motion.div animate={{ x: yearly ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.18)]" />
          </button>
          <span className={`text-[0.8rem] font-medium transition-colors ${yearly ? 'text-ink' : 'text-ink/30'}`}>Yearly</span>
          <AnimatePresence>
            {yearly && (
              <motion.span initial={{ opacity: 0, scale: 0.8, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, x: -6 }}
                className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-accent">
                Save 33%
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── cards ── */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3 items-start">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice
            const period = yearly ? '/yr' : '/mo'
            const visibleFeatures = expanded ? plan.features : plan.features.slice(0, PREVIEW_COUNT)

            return (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative flex flex-col rounded-3xl bg-white border p-7 ${
                  plan.highlight
                    ? 'border-accent/30 shadow-[0_12px_40px_-10px_rgba(201,169,122,0.2),0_1px_3px_rgba(0,0,0,0.04)]'
                    : 'border-ink/[0.07] shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                }`}>

                {/* badge */}
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[0.62rem] font-semibold tracking-wide shadow-sm ${
                    plan.highlight ? 'bg-accent text-white' : 'bg-ink text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                {/* name + tagline */}
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-ink/25">{plan.name}</p>
                <p className="mt-0.5 text-[0.76rem] text-ink/40">{plan.tagline}</p>

                {/* price */}
                <div className="mt-5 flex items-end gap-1.5 min-h-[3rem]">
                  {price === 0 ? (
                    <p className="text-[2.5rem] font-extrabold tracking-[-0.04em] leading-none">$0</p>
                  ) : (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.p key={`${plan.id}-${yearly}`}
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.17 }}
                          className="text-[2.5rem] font-extrabold tracking-[-0.04em] leading-none">
                          ${price.toFixed(2)}
                        </motion.p>
                      </AnimatePresence>
                      <span className="mb-1.5 text-[0.75rem] text-ink/30">{period}</span>
                    </>
                  )}
                </div>
                {yearly && price > 0 && (
                  <p className="mt-1 text-[0.67rem] text-ink/25">${(price / 12).toFixed(2)}/mo · billed annually</p>
                )}
                {!yearly && price > 0 && (
                  <p className="mt-1 text-[0.67rem] text-ink/25">or ${plan.yearlyPrice.toFixed(2)}/yr — save 33%</p>
                )}

                <div className="my-5 h-px bg-ink/[0.05]" />

                {/* features */}
                <ul className="flex-1 space-y-2.5">
                  {visibleFeatures.map((feat) => (
                    <li key={feat.label} className={`flex items-start gap-2.5 text-[0.77rem] leading-[1.5] ${
                      feat.avail === false ? 'text-ink/20' : feat.avail === 'partial' ? 'text-ink/45' : 'text-ink/65'
                    }`}>
                      <span className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md ${
                        feat.avail === false
                          ? 'bg-ink/[0.03]'
                          : feat.avail === 'partial'
                          ? 'bg-amber/10'
                          : 'bg-accent/[0.09]'
                      }`}>
                        {feat.avail === false
                          ? <PCHECK muted />
                          : feat.avail === 'partial'
                          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          : <PCHECK />
                        }
                      </span>
                      <span>
                        {feat.label}
                        {feat.note && feat.avail !== false && (
                          <span className="ml-1 text-[0.67rem] text-ink/30">· {feat.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* expand toggle (only on first card, controls all) */}
                {i === 0 && !expanded && plan.features.length > PREVIEW_COUNT && (
                  <button type="button" onClick={() => setExpanded(true)}
                    className="mt-3 flex items-center gap-1 text-[0.72rem] text-ink/30 hover:text-ink/60 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Show all features
                  </button>
                )}

                {/* CTA */}
                <div className="mt-6">
                  {plan.id === 'free' && (
                    <button type="button" onClick={() => handlePlanCta('free')}
                      className="w-full rounded-2xl border border-ink/[0.1] bg-white py-3.5 text-[0.82rem] font-semibold text-ink/55 transition-all hover:border-ink/[0.18] hover:text-ink/80">
                      {plan.cta}
                    </button>
                  )}
                  {plan.id === 'starter' && (
                    <motion.button type="button" onClick={() => handlePlanCta('starter')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="btn-primary w-full !py-3.5 !text-[0.85rem]"
                      style={{ boxShadow: '0 8px 28px -6px rgba(201,169,122,0.38)' }}>
                      {plan.cta}
                    </motion.button>
                  )}
                  {plan.id === 'pro' && (
                    <motion.button type="button" onClick={() => handlePlanCta('pro')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="w-full rounded-2xl border border-ink/[0.12] bg-ink py-3.5 text-[0.85rem] font-semibold text-white transition-all hover:bg-ink/85">
                      {plan.cta}
                    </motion.button>
                  )}
                  {plan.id !== 'free' && (
                    <p className="mt-2.5 text-center text-[0.64rem] text-ink/25">7-day free trial · No card needed</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* collapse toggle */}
        {expanded && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 text-[0.75rem] text-ink/30 hover:text-ink/60 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              Show less
            </button>
          </div>
        )}

        {/* guarantee strip */}
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.22 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
          {['Cancel anytime', 'No credit card to start', 'Results in your first session', 'Works on every device'].map((text) => (
            <span key={text} className="flex items-center gap-1.5 text-[0.71rem] text-ink/35">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a97a" strokeWidth="2.8" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FAQ - completely redesigned
   ═══════════════════════════════════════════════════════════ */

function FaqSection() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" className="py-14">
      <div className="mx-auto max-w-2xl px-5">
        <SectionHead eyebrow="FAQ" title="Got questions? We've got answers." subtitle="If it's not here, just ask in the app. The AI knows everything." />
        <div className="mt-8 space-y-2">
          {FAQ.map((f, i) => (
            <motion.div key={f.q} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border bg-white transition-all ${open === i ? 'border-accent/20 shadow-[0_4px_16px_-4px_rgba(201,169,122,0.08)]' : 'border-ink/[0.04]'}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${open === i ? 'bg-accent text-white' : 'bg-ink/[0.04] text-ink/25'}`}>
                  {f.icon}
                </span>
                <span className="flex-1 pr-2 text-[0.85rem] font-semibold">{f.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${open === i ? 'bg-accent/10' : 'bg-ink/[0.03]'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={open === i ? 'text-accent' : 'text-ink/25'}><polyline points="6 9 12 15 18 9" /></svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                    <div className="px-5 pb-4 pl-16">
                      <p className="text-[0.82rem] leading-[1.7] text-ink/45">{f.a}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FINAL CTA - emotional, urgent, interactive
   ═══════════════════════════════════════════════════════════ */

function FinalCta({ go, cta, auth }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section ref={ref} className="py-16">
      <div className="mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-14 bg-[#f7f4f0] border border-ink/[0.06]"
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {/* animated background accents */}
          <motion.div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            animate={{ scale: hovered ? 1.2 : [1, 1.1, 1], opacity: hovered ? 0.08 : [0.04, 0.06, 0.04] }}
            transition={{ duration: hovered ? 0.4 : 4, repeat: hovered ? 0 : Infinity }}
            style={{ background: 'radial-gradient(circle, rgba(201,169,122,0.15), transparent 60%)' }} />
          <motion.div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full"
            animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            style={{ background: 'radial-gradient(circle, rgba(88,86,214,0.15), transparent 60%)' }} />

          {/* floating phrases */}
          <motion.div className="pointer-events-none absolute right-8 top-8 hidden rounded-xl bg-white/70 px-3 py-2 border border-ink/[0.05] sm:block"
            animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }} transition={{ duration: 5, repeat: Infinity }}>
            <p className="text-[0.65rem] text-ink/25">
              &ldquo;Une table pour deux&rdquo;
            </p>
          </motion.div>
          <motion.div className="pointer-events-none absolute left-8 bottom-8 hidden rounded-xl bg-white/70 px-3 py-2 border border-ink/[0.05] sm:block"
            animate={{ y: [0, 6, 0], rotate: [0, -1.5, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}>
            <p className="text-[0.65rem] text-ink/25">
              &ldquo;Merci beaucoup&rdquo;
            </p>
          </motion.div>

          <div className="relative">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
            </motion.div>

            <h2 className="text-[clamp(1.6rem,4vw,2.6rem)] font-bold tracking-[-0.03em] leading-tight">
              Stop translating in your head.<br />
              <span className="gradient-text">Start speaking.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[0.88rem] leading-[1.6] text-ink/40">
              30 seconds from now, you could be practicing your first phrase. No credit card. No commitment. Just open your mouth.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <motion.button type="button" onClick={() => go(cta)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary !px-7 !py-3.5 !text-[0.88rem] shadow-[0_8px_32px_-8px_rgba(201,169,122,0.4)] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
                {auth.session ? 'Open app' : 'Start speaking instantly'}
              </motion.button>
              <a href="#demo" className="btn-ghost !px-5 !py-3.5 !text-[0.82rem]">
                Try live demo first
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[0.68rem] text-ink/30">
              {['No credit card', 'Cancel anytime', 'Works offline', 'Early access'].map((item) => (
                <span key={item} className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function SectionHead({ eyebrow, title, subtitle, dark }) {
  return (
    <motion.div className="text-center" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
      <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${dark ? 'text-accent/80' : 'text-accent'}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-[clamp(1.5rem,3.5vw,2.2rem)] font-bold leading-tight tracking-[-0.03em] ${dark ? 'text-white' : ''}`}>{title}</h2>
      {subtitle ? <p className={`mx-auto mt-3 max-w-lg text-[0.85rem] leading-[1.6] ${dark ? 'text-white/35' : 'text-ink/40'}`}>{subtitle}</p> : null}
    </motion.div>
  )
}

function OutcomeIcon({ kind }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (kind === 'restaurant') return <svg {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>
  if (kind === 'voice') return <svg {...props}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
  if (kind === 'ear') return <svg {...props}><path d="M6 8a6 6 0 1112 0c0 3-2 4-3 5s-1 1.5-1 2.5" /><path d="M12 20h.01" /></svg>
  if (kind === 'chat') return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
  if (kind === 'spark') return <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  if (kind === 'growth') return <svg {...props}><path d="M23 6l-9.5 9.5-5-5L1 18" /><polyline points="17 6 23 6 23 12" /></svg>
  return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>
}
