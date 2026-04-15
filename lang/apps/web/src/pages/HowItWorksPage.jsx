import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useCallback } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'
import { MarketingNav, MarketingFooter } from '@/pages/MarketingShared'

const STEPS = [
  {
    num: '01',
    color: '#22c55e',
    title: 'Tell the AI what you need',
    subtitle: 'Any situation, any language, any level',
    detail: 'Just speak naturally. "I\'m going to Paris next week and I need to order food." The AI builds a custom session around your actual life — not a preset lesson tree.',
    orbState: 'listening',
    visual: (
      <div className="space-y-3">
        <div className="rounded-xl bg-accent/[0.06] px-4 py-3.5 border border-accent/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.07em] text-accent/50">You say</p>
          </div>
          <p className="text-[0.9rem] text-ink/65">&ldquo;I want to order dinner in French at a restaurant&rdquo;</p>
        </div>
        <div className="flex items-center gap-2 px-2">
          {[...Array(28)].map((_, i) => (
            <motion.div key={i} className="w-[2.5px] rounded-full bg-accent/25"
              animate={{ height: [3, 3 + Math.sin(i * 0.6) * 12, 3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.035 }} />
          ))}
        </div>
        <div className="rounded-xl bg-ink/[0.025] px-4 py-3.5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.07em] text-ink/25 mb-1.5">AI builds your session</p>
          <div className="flex flex-wrap gap-1.5">
            {['4 phrases', 'Beginner level', 'Restaurant scenario', '~8 min'].map((t) => (
              <span key={t} className="rounded-full bg-white border border-ink/[0.07] px-2.5 py-0.5 text-[0.65rem] font-medium text-ink/50">{t}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    color: '#5856d6',
    title: 'Speak — get corrected live',
    subtitle: 'Every word scored in real time',
    detail: 'The AI listens to every syllable. It scores your pronunciation word by word and shows you exactly what went wrong: tongue placement, lip shape, airflow, stress. Not just "try again."',
    orbState: 'thinking',
    visual: (
      <div className="space-y-3">
        <div className="rounded-xl bg-red-50/80 px-4 py-3.5 border border-red-100">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.07em] text-red-400/70 mb-1.5">You said</p>
          <p className="text-[0.9rem] text-ink/60">
            Je veux{' '}
            <span className="rounded-md bg-red-500/12 px-1.5 py-0.5 font-semibold text-red-500 line-through decoration-red-400">
              une tab
            </span>
            {' '}pour deux
          </p>
        </div>
        <div className="rounded-xl bg-[#30d158]/[0.05] px-4 py-3.5 border border-[#30d158]/[0.1]">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.07em] text-[#30d158]/60 mb-1.5">Say this instead</p>
          <p className="text-[0.9rem] text-ink/65">
            Je voudrais{' '}
            <span className="rounded-md bg-[#30d158]/10 px-1.5 py-0.5 font-semibold text-[#30d158]">
              une table
            </span>
            {' '}pour deux
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white border border-ink/[0.06] px-4 py-2.5">
          <span className="text-[0.72rem] text-ink/35">Pronunciation score</span>
          <span className="text-[1.3rem] font-extrabold text-[#5856d6]">73%</span>
        </div>
      </div>
    ),
  },
  {
    num: '03',
    color: '#ff9f0a',
    title: 'Hear it, replay it, nail it',
    subtitle: 'Native audio at any speed',
    detail: 'Hear the exact phrase from a native speaker. Replay at 50% speed to isolate every sound. Record yourself, compare, and hear the difference. When you hit 85%+ you move on.',
    orbState: 'speaking',
    visual: (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 pb-1">
          {['Tongue tip up', 'Round lips', 'Softer r', 'Nasal "eu"'].map((t) => (
            <span key={t} className="rounded-full bg-[#ff9f0a]/[0.08] px-2.5 py-1 text-[0.65rem] font-semibold text-[#ff9f0a]">{t}</span>
          ))}
        </div>
        <div className="rounded-xl bg-white border border-ink/[0.07] px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[0.65rem] font-semibold text-ink/30">Session progress</p>
            <span className="text-[0.65rem] font-bold text-accent">3 / 4 phrases</span>
          </div>
          {[92, 78, 87, 0].map((score, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-ink/[0.06] overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: score >= 85 ? '#22c55e' : score > 0 ? '#ff9f0a' : '#e5e7eb' }}
                  initial={{ width: 0 }}
                  whileInView={{ width: score > 0 ? `${score}%` : '0%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.4 + i * 0.15 }} />
              </div>
              <span className={`w-7 text-right text-[0.62rem] font-bold ${score >= 85 ? 'text-accent' : score > 0 ? 'text-[#ff9f0a]' : 'text-ink/20'}`}>
                {score > 0 ? `${score}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

const DIFFERENCE = [
  {
    them: 'Duolingo',
    their: 'Tap words, match pictures, read translations',
    ours: 'Open your mouth from second one. The AI hears every sound.',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>,
  },
  {
    them: 'YouTube videos',
    their: 'Watch someone else speak. Passive and forgettable.',
    ours: 'You practice. You get corrected. You improve — in the session.',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>,
  },
  {
    them: 'Rosetta Stone',
    their: 'Fixed lesson trees. No personalization. No real speech.',
    ours: 'Every session is built around your goal. Zero preset paths.',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
]

function Step({ step, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const isEven = index % 2 === 0

  return (
    <motion.div ref={ref} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="relative py-14 sm:py-20">

      {/* connector line (not on last) */}
      {index < STEPS.length - 1 && (
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-px h-14 bg-gradient-to-b from-ink/[0.08] to-transparent hidden lg:block" />
      )}

      <div className={`mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-2`}>
        {/* text side */}
        <motion.div initial={{ opacity: 0, x: isEven ? -24 : 24 }} animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={isEven ? '' : 'lg:order-2'}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[0.78rem] font-bold text-white"
              style={{ background: step.color }}>
              {step.num}
            </div>
            <div className="h-px flex-1 bg-ink/[0.06]" />
          </div>
          <h2 className="text-[clamp(1.5rem,3.5vw,2.2rem)] font-extrabold tracking-[-0.035em] leading-tight">
            {step.title}
          </h2>
          <p className="mt-1.5 text-[0.9rem] font-medium" style={{ color: step.color + 'aa' }}>
            {step.subtitle}
          </p>
          <p className="mt-4 text-[0.88rem] leading-[1.75] text-ink/45">{step.detail}</p>
        </motion.div>

        {/* visual side */}
        <motion.div initial={{ opacity: 0, x: isEven ? 24 : -24 }} animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.18 }}
          className={isEven ? '' : 'lg:order-1'}>
          <div className="rounded-2xl bg-white border border-ink/[0.07] p-6"
            style={{ boxShadow: '0 12px 40px -12px rgba(0,0,0,0.07)' }}>
            <div className="flex justify-center mb-5">
              <AISphere state={inView ? step.orbState : 'idle'} activityLevel={0.55} size={72} disabled />
            </div>
            {step.visual}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function HowItWorksPage({ auth, route }) {
  const go = useCallback((path) => route.navigate(path), [route])
  const cta = auth.session ? APP_ROUTES.app : APP_ROUTES.signup

  return (
    <div className="min-h-screen bg-white text-ink overflow-x-hidden">
      <MarketingNav auth={auth} go={go} />

      {/* hero */}
      <section className="relative overflow-hidden pt-28 pb-6 sm:pt-36 sm:pb-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #ffffff 100%)' }} />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[350px] opacity-[0.05]"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #22c55e, transparent 60%)' }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="eyebrow mb-3">How it works</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Three steps to<br />
            <span className="gradient-text">sounding native</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-[1.7] text-ink/40">
            No grammar drills. No flashcard decks. No tap-the-word games. You speak, the AI coaches, you improve — every session.
          </motion.p>
        </div>
      </section>

      {/* steps */}
      {STEPS.map((s, i) => <Step key={s.num} step={s} index={i} />)}

      {/* vs. the competition */}
      <section className="py-16 px-5" style={{ background: 'linear-gradient(180deg, #f9f7f4 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <p className="eyebrow mb-2">Why not the others?</p>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold tracking-[-0.03em]">
              Other apps teach you to read.<br />We teach you to speak.
            </h2>
          </div>
          <div className="space-y-3">
            {DIFFERENCE.map((d, i) => (
              <motion.div key={d.them} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center rounded-2xl bg-white border border-ink/[0.06] p-5 sm:p-6"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.07em] text-ink/25 mb-1.5">{d.them}</p>
                  <p className="text-[0.82rem] text-ink/40 leading-snug">{d.their}</p>
                </div>
                <div className="hidden sm:flex h-8 w-8 mx-auto shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  {d.icon}
                </div>
                <div className="border-t border-ink/[0.05] sm:border-t-0 sm:border-l sm:pl-5 pt-3 sm:pt-0">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.07em] text-accent/50 mb-1.5">UseLang</p>
                  <p className="text-[0.82rem] font-medium text-ink/60 leading-snug">{d.ours}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl bg-white border border-ink/[0.07] p-10"
            style={{ boxShadow: '0 16px 56px -16px rgba(0,0,0,0.08)' }}>
            <div className="mb-5 flex justify-center">
              <AISphere state="idle" activityLevel={0.3} size={72} disabled />
            </div>
            <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em]">
              See it for yourself.
            </h2>
            <p className="mt-2 text-[0.84rem] text-ink/40">No credit card. First session in under 30 seconds.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => go(cta)}
                className="btn-primary !px-8 !py-3.5 !text-[0.88rem]"
                style={{ boxShadow: '0 8px 28px -6px rgba(34,197,94,0.38)' }}>
                Start speaking free
              </button>
              <button type="button" onClick={() => go(APP_ROUTES.demo)}
                className="btn-ghost !px-6 !py-3.5 !text-[0.85rem]">
                Try the demo first
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <MarketingFooter go={go} />
    </div>
  )
}
