import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CONFIDENCE_LEVELS,
  CORRECTION_INTENSITY,
  GOAL_OPTIONS,
  SUPPORTED_LANGUAGES,
  TUTOR_STYLE_OPTIONS,
} from '@shared/languages'
import { APP_ROUTES } from '@/lib/routes'
import { AISphere } from '@/components/AISphere'

const SAND = '#c9a97a'

const LANG_META = {
  en: { native: 'English',    accent: '#88a9d8' },
  es: { native: 'Español',    accent: '#d79a73' },
  fr: { native: 'Français',   accent: '#6d8dcf' },
  de: { native: 'Deutsch',    accent: '#8b8b8b' },
  it: { native: 'Italiano',   accent: '#74aa82' },
  ja: { native: '日本語',      accent: '#cf7c7c' },
  nl: { native: 'Nederlands', accent: '#be9c69' },
  zh: { native: '普通话',      accent: '#d38f66' },
  hi: { native: 'हिन्दी',     accent: '#b87f5d' },
}

const GOAL_META = {
  travel:           { icon: 'travel', color: '#c97a5c' },
  work:             { icon: 'work',   color: '#c9a030' },
  family:           { icon: 'family', color: '#8a9c6e' },
  school:           { icon: 'school', color: '#a07c52' },
  general_interest: { icon: 'world',  color: SAND      },
}

const CONFIDENCE_META = {
  beginner:       { icon: 'seed',   sub: 'Starting from scratch' },
  basics:         { icon: 'sprout', sub: 'Know a little already' },
  conversational: { icon: 'tree',   sub: 'Getting through exchanges' },
}

const STYLE_META = {
  encouraging: { icon: 'support', sub: 'Warm & reassuring' },
  balanced:    { icon: 'balance', sub: 'Clear with steady pace' },
  strict:      { icon: 'target',  sub: 'High standards, fast pace' },
}

const CORRECTION_META = {
  light:    { icon: 'wave',  sub: 'Major mistakes only' },
  balanced: { icon: 'bell',  sub: 'Important words corrected' },
  strict:   { icon: 'focus', sub: 'Every detail caught' },
}

const SLIDE = {
  initial:    { opacity: 0, y: 18 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -14 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
}

export function OnboardingPage({ auth, route }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(() => ({
    languageLearning:    auth.profile?.languageLearning    || '',
    nativeLanguage:      auth.profile?.nativeLanguage      || '',
    goal:                auth.profile?.goal                || '',
    confidenceLevel:     auth.profile?.confidenceLevel     || '',
    tutorStyle:          auth.profile?.tutorStyle          || '',
    correctionIntensity: auth.profile?.correctionIntensity || 'balanced',
  }))

  const steps = useMemo(() => [
    { id: 'welcome',             type: 'welcome'  },
    { id: 'languageLearning',    type: 'language', title: "Which language\nare you learning?" },
    { id: 'nativeLanguage',      type: 'language', title: 'What do you\nalready speak?' },
    { id: 'goal',                type: 'goal',     title: "Why are you\nlearning?" },
    { id: 'confidenceLevel',     type: 'choice',   title: 'What level\nare you at?' },
    { id: 'tutorStyle',          type: 'choice',   title: 'How should\nyour coach sound?' },
    { id: 'correctionIntensity', type: 'choice',   title: 'How strict\nshould I be?' },
  ], [])

  const isInstallStep = stepIndex === steps.length
  const currentStep   = steps[stepIndex]
  const isWelcome     = currentStep?.type === 'welcome'
  const currentValue  = currentStep && !isWelcome ? form[currentStep.id] : null
  const canContinue   = isInstallStep || isWelcome || Boolean(currentValue)
  const totalDots     = steps.length + 1

  async function handleContinue() {
    if (isInstallStep) {
      await auth.updateProfile(form)
      route.navigate(APP_ROUTES.app)
      return
    }
    setStepIndex((c) => c + 1)
  }

  function handleBack() {
    setStepIndex((c) => Math.max(0, c - 1))
  }

  function pick(value) {
    setForm((c) => ({ ...c, [currentStep.id]: value }))
  }

  return (
    <div
      className="min-h-svh"
      style={{ background: 'linear-gradient(180deg, #fdfaf5 0%, #f5ede0 100%)' }}
    >
      <div className="phone-shell flex flex-col" style={{ background: 'transparent' }}>

        {/* ── Top: back + dot progress ── */}
        <div className="relative z-10 flex items-center px-5 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-ink/40 transition disabled:opacity-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex flex-1 items-center justify-center gap-1.5 px-3">
            {Array.from({ length: totalDots }, (_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                animate={{
                  width:      i === stepIndex ? 20 : 5,
                  height:     5,
                  background: i <= stepIndex ? SAND : 'rgba(0,0,0,0.15)',
                  opacity:    i <= stepIndex ? 1 : 0.45,
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>

          <div className="h-9 w-9" />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <AnimatePresence mode="wait">
            {isInstallStep ? (
              <motion.div key="install" {...SLIDE}>
                <InstallStep />
              </motion.div>
            ) : (
              <motion.div key={currentStep.id} {...SLIDE}>
                {isWelcome ? (
                  <WelcomeStep />
                ) : currentStep.type === 'language' ? (
                  <LanguageStep step={currentStep} value={currentValue} onPick={pick} />
                ) : currentStep.type === 'goal' ? (
                  <GoalStep step={currentStep} value={currentValue} onPick={pick} />
                ) : (
                  <ChoiceStep step={currentStep} value={currentValue} onPick={pick} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CTA ── */}
        <div className="relative z-10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || auth.busy}
            className="btn-warm w-full"
          >
            {auth.busy
              ? 'Saving…'
              : isInstallStep
              ? 'Get started'
              : isWelcome
              ? "Let's begin"
              : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  )
}

/* ─── Welcome ──────────────────────────────────────────────────── */
function WelcomeStep() {
  const features = [
    { icon: 'target',   label: 'Personalized to your goals' },
    { icon: 'mic',      label: 'Real-time pronunciation feedback' },
    { icon: 'download', label: 'Works offline with local AI' },
  ]
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <AISphere tone="warm" state="speaking" activityLevel={0.4} size={130} disabled hideLabel />
      <div className="text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em]" style={{ color: SAND }}>
          Welcome
        </p>
        <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.1] tracking-[-0.04em] text-ink">
          Your personal<br />language tutor.
        </h1>
        <p className="mt-3 text-[0.88rem] leading-[1.7] text-ink/42">
          Answer a few questions. Then just speak —<br />the AI coaches you in real time.
        </p>
      </div>
      <div className="w-full space-y-3">
        {features.map(({ icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.09, duration: 0.28 }}
            className="flex items-center gap-3"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(201,169,122,0.14)', color: SAND }}
            >
              <OnboardingIcon name={icon} />
            </span>
            <p className="text-[0.86rem] font-medium text-ink/55">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Language picker ──────────────────────────────────────────── */
function LanguageStep({ step, value, onPick }) {
  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AISphere tone="warm" state="idle" activityLevel={0.15} size={60} disabled hideLabel />
        <h1 className="whitespace-pre-line text-center text-[1.9rem] font-bold leading-[1.12] tracking-[-0.04em] text-ink">
          {step.title}
        </h1>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {SUPPORTED_LANGUAGES.map((lang, i) => {
          const active = value === lang.code
          return (
            <motion.button
              key={lang.code}
              type="button"
              onClick={() => onPick(lang.code)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-all"
              style={{
                background: active ? SAND : 'rgba(255,255,255,0.9)',
                color:      active ? '#fff' : '#0f1419',
                boxShadow:  active
                  ? '0 8px 24px -8px rgba(201,169,122,0.5)'
                  : '0 2px 8px -4px rgba(15,20,25,0.1), 0 0 0 0.5px rgba(0,0,0,0.05)',
              }}
            >
              <span className="text-[0.88rem] font-semibold">{lang.label}</span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Goal picker (horizontal scroll cards) ─────────────────────── */
function GoalStep({ step, value, onPick }) {
  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AISphere tone="warm" state="idle" activityLevel={0.15} size={60} disabled hideLabel />
        <h1 className="whitespace-pre-line text-center text-[1.9rem] font-bold leading-[1.12] tracking-[-0.04em] text-ink">
          {step.title}
        </h1>
      </div>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-3 no-scrollbar">
        {GOAL_OPTIONS.map((goal, i) => {
          const meta   = GOAL_META[goal.id] || { icon: 'world', color: SAND }
          const active = value === goal.id
          return (
            <motion.button
              key={goal.id}
              type="button"
              onClick={() => onPick(goal.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.24 }}
              whileTap={{ scale: 0.97 }}
              className="flex w-36 shrink-0 flex-col items-start rounded-[1.5rem] p-4 text-left transition-all"
              style={{
                background: active ? `${meta.color}15` : 'rgba(255,255,255,0.9)',
                boxShadow:  active
                  ? `0 12px 32px -10px ${meta.color}44`
                  : '0 2px 8px -4px rgba(15,20,25,0.07), 0 0 0 0.5px rgba(0,0,0,0.05)',
                outline: active ? `1.5px solid ${meta.color}44` : 'none',
              }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
                style={{
                  background: active ? `${meta.color}22` : 'rgba(0,0,0,0.04)',
                  color: meta.color,
                }}
              >
                <OnboardingIcon name={meta.icon} />
              </span>
              <p className="mt-3 text-[0.88rem] font-bold leading-snug text-ink">{goal.label}</p>
              <p className="mt-1 text-[0.7rem] leading-snug text-ink/40">{goal.detail}</p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Choice step (confidence / tutor style / correction) ────────── */
function ChoiceStep({ step, value, onPick }) {
  const metaMap = step.id === 'confidenceLevel' ? CONFIDENCE_META
    : step.id === 'tutorStyle' ? STYLE_META
    : CORRECTION_META

  const options = step.id === 'confidenceLevel' ? CONFIDENCE_LEVELS
    : step.id === 'tutorStyle' ? TUTOR_STYLE_OPTIONS
    : CORRECTION_INTENSITY

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AISphere tone="warm" state="idle" activityLevel={0.15} size={60} disabled hideLabel />
        <h1 className="whitespace-pre-line text-center text-[1.9rem] font-bold leading-[1.12] tracking-[-0.04em] text-ink">
          {step.title}
        </h1>
      </div>
      <div className="space-y-2.5">
        {options.map((option, i) => {
          const meta   = metaMap[option.id] || { icon: 'balance' }
          const active = value === option.id
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => onPick(option.id)}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.24 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center gap-4 rounded-[1.4rem] px-4 py-3.5 text-left transition-all"
              style={{
                background: active ? 'rgba(201,169,122,0.12)' : 'rgba(255,255,255,0.88)',
                boxShadow:  active
                  ? '0 8px 24px -8px rgba(201,169,122,0.28)'
                  : '0 2px 8px -4px rgba(15,20,25,0.06), 0 0 0 0.5px rgba(0,0,0,0.05)',
                outline: active ? '1px solid rgba(201,169,122,0.38)' : 'none',
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(0,0,0,0.04)', color: SAND }}
              >
                <OnboardingIcon name={meta.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-semibold text-ink">{option.label}</p>
                <p className="mt-0.5 text-[0.72rem] leading-snug text-ink/38">{meta.sub || option.detail}</p>
              </div>
              <motion.div
                animate={{ scale: active ? 1 : 0.5, opacity: active ? 1 : 0 }}
                transition={{ duration: 0.18 }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: SAND }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </motion.div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Install (last step) ─────────────────────────────────────── */
function InstallStep() {
  return (
    <div className="space-y-8 py-4">
      <div className="text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em]" style={{ color: SAND }}>
          One last step
        </p>
        <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.04em] text-ink">
          Add to your<br />home screen.
        </h1>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink/42">
          Opens full screen, feels native.
        </p>
      </div>
      <div className="space-y-4">
        {[
          { n: 1, text: 'Open the browser share menu.' },
          { n: 2, text: 'Choose "Add to Home Screen".' },
          { n: 3, text: 'Launch from your home screen.' },
        ].map(({ n, text }) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: n * 0.1, duration: 0.26 }}
            className="flex items-center gap-4"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.82rem] font-bold text-white"
              style={{ background: SAND }}
            >
              {n}
            </span>
            <p className="text-[0.88rem] text-ink/60">{text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Icon glyph ──────────────────────────────────────────────── */
function OnboardingIcon({ name }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'travel':   return <svg {...p}><path d="M3 11l18-5-5 18-3-8-10-5z" /></svg>
    case 'work':     return <svg {...p}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
    case 'family':   return <svg {...p}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>
    case 'school':   return <svg {...p}><path d="M4 6.5L12 3l8 3.5L12 10 4 6.5z" /><path d="M6.5 8.2V14c0 1.4 2.4 3 5.5 3s5.5-1.6 5.5-3V8.2" /></svg>
    case 'world':    return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 010 18" /><path d="M12 3a14 14 0 000 18" /></svg>
    case 'seed':     return <svg {...p}><path d="M12 20v-7" /><path d="M12 13c-3.3 0-6-2.7-6-6 3.3 0 6 2.7 6 6z" /><path d="M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z" /></svg>
    case 'sprout':   return <svg {...p}><path d="M12 21v-8" /><path d="M9 13c-2.2 0-4-1.8-4-4 2.2 0 4 1.8 4 4z" /><path d="M15 13c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4z" /></svg>
    case 'tree':     return <svg {...p}><path d="M12 21v-4" /><path d="M7 17h10" /><path d="M8 17a4 4 0 118 0" /><path d="M9 11a3 3 0 116 0" /></svg>
    case 'support':  return <svg {...p}><path d="M8 13l4 4 4-4" /><path d="M8 11a4 4 0 118-2" /></svg>
    case 'balance':  return <svg {...p}><path d="M12 4v16" /><path d="M6 8h12" /><path d="M7 8l-3 5h6l-3-5z" /><path d="M17 8l-3 5h6l-3-5z" /></svg>
    case 'target':   return <svg {...p}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></svg>
    case 'wave':     return <svg {...p}><path d="M3 14c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 2-4" /></svg>
    case 'bell':     return <svg {...p}><path d="M6 9a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 004 0" /></svg>
    case 'focus':    return <svg {...p}><path d="M4 12h4" /><path d="M16 12h4" /><path d="M12 4v4" /><path d="M12 16v4" /><circle cx="12" cy="12" r="3" /></svg>
    case 'mic':      return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    default:         return <svg {...p}><circle cx="12" cy="12" r="8" /></svg>
  }
}
