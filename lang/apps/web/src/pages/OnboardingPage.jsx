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
const SAND_BG = '#f5ede0'

/* flags + native names for the language picker */
const LANG_META = {
  en: { native: 'English', accent: '#88a9d8' },
  es: { native: 'Español', accent: '#d79a73' },
  fr: { native: 'Français', accent: '#6d8dcf' },
  de: { native: 'Deutsch', accent: '#8b8b8b' },
  it: { native: 'Italiano', accent: '#74aa82' },
  ja: { native: '日本語', accent: '#cf7c7c' },
  nl: { native: 'Nederlands', accent: '#be9c69' },
  zh: { native: '普通话', accent: '#d38f66' },
  hi: { native: 'हिन्दी', accent: '#b87f5d' },
}

const GOAL_META = {
  travel:          { icon: 'travel', color: '#c97a5c' },
  work:            { icon: 'work', color: '#c9a030' },
  family:          { icon: 'family', color: '#8a9c6e' },
  school:          { icon: 'school', color: '#a07c52' },
  general_interest:{ icon: 'world', color: SAND },
}

const CONFIDENCE_META = {
  beginner:      { icon: 'seed', sub: 'Starting from scratch' },
  basics:        { icon: 'sprout', sub: 'Know a little already' },
  conversational:{ icon: 'tree', sub: 'Getting through exchanges' },
}

const STYLE_META = {
  encouraging: { icon: 'support', sub: 'Warm & reassuring' },
  balanced:    { icon: 'balance', sub: 'Clear with steady pace' },
  strict:      { icon: 'target', sub: 'High standards, fast pace' },
}

const CORRECTION_META = {
  light:    { icon: 'wave', sub: 'Major mistakes only' },
  balanced: { icon: 'bell', sub: 'Important words corrected' },
  strict:   { icon: 'focus', sub: 'Every detail caught' },
}

const STEP_TRANSITION = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
}

export function OnboardingPage({ auth, route }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(() => ({
    languageLearning: auth.profile?.languageLearning || '',
    nativeLanguage: auth.profile?.nativeLanguage || '',
    goal: auth.profile?.goal || '',
    confidenceLevel: auth.profile?.confidenceLevel || '',
    tutorStyle: auth.profile?.tutorStyle || '',
    correctionIntensity: auth.profile?.correctionIntensity || 'balanced',
  }))

  const steps = useMemo(() => [
    { id: 'welcome', type: 'welcome' },
    { id: 'languageLearning', type: 'language', eyebrow: 'Step 1 of 6', title: 'Which language are you learning?' },
    { id: 'nativeLanguage',   type: 'language', eyebrow: 'Step 2 of 6', title: 'What language do you already speak?' },
    { id: 'goal',             type: 'goal',     eyebrow: 'Step 3 of 6', title: "Why are you learning?" },
    { id: 'confidenceLevel',  type: 'choice',   eyebrow: 'Step 4 of 6', title: 'How would you describe your level?' },
    { id: 'tutorStyle',       type: 'choice',   eyebrow: 'Step 5 of 6', title: 'How should your coach sound?' },
    { id: 'correctionIntensity', type: 'choice', eyebrow: 'Step 6 of 6', title: 'How strictly should mistakes be caught?' },
  ], [])

  const isInstallStep = stepIndex === steps.length
  const currentStep = steps[stepIndex]
  const isWelcome = currentStep?.type === 'welcome'
  const currentValue = currentStep && !isWelcome ? form[currentStep.id] : null
  const canContinue = isInstallStep || isWelcome || Boolean(currentValue)
  const totalSteps = steps.length + 1
  const progress = ((stepIndex + 1) / totalSteps) * 100

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
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #faf6f1 100%)' }}
    >
      <div
        className="phone-shell flex flex-col"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #faf6f1 100%)' }}
      >
        {/* Progress bar */}
        <div className="relative z-10 px-5 pt-[calc(env(safe-area-inset-top)+1.2rem)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink/40 disabled:opacity-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-black/[0.05]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: SAND }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[0.65rem] font-medium tabular-nums text-ink/22">{stepIndex + 1}/{totalSteps}</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-4 pt-6">
          <AnimatePresence mode="wait">
            {isInstallStep ? (
              <motion.section key="install" {...STEP_TRANSITION} className="space-y-5">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: SAND }}>
                    One last step
                  </p>
                  <h1 className="mt-3 text-[1.9rem] font-bold leading-tight tracking-[-0.04em] text-ink">
                    Add UseLang to your home screen.
                  </h1>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-ink/40">
                    Opens full screen, feels native. No App Store needed.
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-white p-5" style={{ boxShadow: '0 8px 32px -12px rgba(201,169,122,0.18)' }}>
                  {[
                    { n: 1, text: 'Open the browser share menu.' },
                    { n: 2, text: 'Choose Add to Home Screen.' },
                    { n: 3, text: 'Launch from your home screen.' },
                  ].map(({ n, text }) => (
                    <div key={n} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 border-b border-black/[0.04] last:border-0">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white"
                        style={{ background: SAND }}
                      >{n}</span>
                      <p className="text-[0.82rem] text-ink/55 leading-snug">{text}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

            ) : (
              <motion.section key={currentStep.id} {...STEP_TRANSITION}>
                {isWelcome ? (
                  <WelcomeStep />
                ) : currentStep.type === 'language' ? (
                  <LanguageStep step={currentStep} value={currentValue} onPick={pick} />
                ) : currentStep.type === 'goal' ? (
                  <GoalStep step={currentStep} value={currentValue} onPick={pick} />
                ) : (
                  <ChoiceStep step={currentStep} value={currentValue} onPick={pick} />
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || auth.busy}
            className="btn-warm w-full"
          >
            {auth.busy
              ? 'Saving...'
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

/* ─── Welcome step ─── */
function WelcomeStep() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center pt-2">
        <AISphere tone="warm" state="idle" activityLevel={0.3} size={140} disabled hideLabel />
      </div>
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: SAND }}>
          Welcome
        </p>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.1] tracking-[-0.04em] text-ink">
          Your personal<br />language tutor.
        </h1>
        <p className="mt-3 text-[0.9rem] leading-[1.7] text-ink/42">
          Answer 6 quick questions. Then just speak — the AI coaches you in real time.
        </p>
      </div>
      <div
        className="rounded-[1.6rem] bg-white p-5"
        style={{ boxShadow: '0 12px 36px -16px rgba(201,169,122,0.18)' }}
      >
        {[
          { icon: 'target', text: 'Personalized to your language and goals' },
          { icon: 'mic', text: 'Real-time pronunciation feedback' },
          { icon: 'download', text: 'Works offline with a local AI model' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3.5 py-2.5 border-b border-black/[0.04] last:border-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.03] text-[#c9a97a]">
              <OnboardingIcon name={icon} />
            </span>
            <p className="text-[0.82rem] font-medium text-ink/60 leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Language step — big flag cards ─── */
function LanguageStep({ step, value, onPick }) {
  return (
    <div>
      <StepHeader eyebrow={step.eyebrow} title={step.title} />
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const meta = LANG_META[lang.code] || { native: lang.label, accent: SAND }
          const active = value === lang.code
          return (
            <motion.button
              key={lang.code}
              type="button"
              onClick={() => onPick(lang.code)}
              whileTap={{ scale: 0.97 }}
              className="relative flex flex-col items-center rounded-[1.4rem] p-4 text-center transition-all"
              style={{
                background: active ? SAND_BG : '#ffffff',
                outline: active ? `1.5px solid ${SAND}44` : '1px solid rgba(0,0,0,0.05)',
                boxShadow: active
                  ? `0 8px 28px -8px rgba(201,169,122,0.28)`
                  : '0 2px 10px -4px rgba(15,20,25,0.07)',
              }}
            >
              {active && (
                <span
                  className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: SAND }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
              )}
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-[0.78rem] font-semibold"
                style={{ background: active ? `${meta.accent}22` : 'rgba(0,0,0,0.03)', color: meta.accent }}
              >
                {lang.label.slice(0, 2).toUpperCase()}
              </span>
              <p className="mt-2 text-[0.85rem] font-semibold text-ink">{lang.label}</p>
              <p className="mt-0.5 text-[0.68rem] text-ink/30">{meta.native}</p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Goal step — large cards with emoji + color ─── */
function GoalStep({ step, value, onPick }) {
  return (
    <div>
      <StepHeader eyebrow={step.eyebrow} title={step.title} />
      <div className="mt-5 space-y-2.5">
        {GOAL_OPTIONS.map((goal) => {
          const meta = GOAL_META[goal.id] || { icon: 'world', color: SAND }
          const active = value === goal.id
          return (
            <motion.button
              key={goal.id}
              type="button"
              onClick={() => onPick(goal.id)}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center gap-4 rounded-[1.35rem] p-4 text-left transition-all"
              style={{
                background: active ? SAND_BG : '#ffffff',
                outline: active ? `1.5px solid ${SAND}44` : '1px solid rgba(0,0,0,0.05)',
                boxShadow: active ? `0 8px 24px -8px rgba(201,169,122,0.22)` : '0 2px 10px -4px rgba(15,20,25,0.06)',
              }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-xl"
                style={{ background: active ? meta.color + '18' : 'rgba(0,0,0,0.03)' }}
              >
                <OnboardingIcon name={meta.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.9rem] font-semibold text-ink">{goal.label}</p>
                <p className="mt-0.5 text-[0.72rem] text-ink/38 leading-snug">{goal.detail}</p>
              </div>
              {active && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SAND} strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Choice step — confidence / tutor style / correction ─── */
function ChoiceStep({ step, value, onPick }) {
  const metaMap = step.id === 'confidenceLevel' ? CONFIDENCE_META
    : step.id === 'tutorStyle' ? STYLE_META
    : CORRECTION_META

  const options = step.id === 'confidenceLevel' ? CONFIDENCE_LEVELS
    : step.id === 'tutorStyle' ? TUTOR_STYLE_OPTIONS
    : CORRECTION_INTENSITY

  return (
    <div>
      <StepHeader eyebrow={step.eyebrow} title={step.title} />
      <div className="mt-5 space-y-2.5">
        {options.map((option) => {
          const meta = metaMap[option.id] || { icon: 'balance' }
          const active = value === option.id
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => onPick(option.id)}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center gap-4 rounded-[1.35rem] p-4 text-left transition-all"
              style={{
                background: active ? SAND_BG : '#ffffff',
                outline: active ? `1.5px solid ${SAND}44` : '1px solid rgba(0,0,0,0.05)',
                boxShadow: active ? `0 8px 24px -8px rgba(201,169,122,0.22)` : '0 2px 10px -4px rgba(15,20,25,0.06)',
              }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-black/[0.03] text-[#c9a97a]">
                <OnboardingIcon name={meta.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.9rem] font-semibold text-ink">{option.label}</p>
                <p className="mt-0.5 text-[0.72rem] text-ink/38 leading-snug">{meta.sub || option.detail}</p>
              </div>
              {active && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SAND} strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step header ─── */
function StepHeader({ eyebrow, title }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em]" style={{ color: SAND }}>
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.04em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-[0.82rem] text-ink/38">
        You can change this later in Settings.
      </p>
    </div>
  )
}

function OnboardingIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }

  switch (name) {
    case 'travel':
      return <svg {...common}><path d="M3 11l18-5-5 18-3-8-10-5z" /></svg>
    case 'work':
      return <svg {...common}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
    case 'family':
      return <svg {...common}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>
    case 'school':
      return <svg {...common}><path d="M4 6.5L12 3l8 3.5L12 10 4 6.5z" /><path d="M6.5 8.2V14c0 1.4 2.4 3 5.5 3s5.5-1.6 5.5-3V8.2" /></svg>
    case 'world':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 010 18" /><path d="M12 3a14 14 0 000 18" /></svg>
    case 'seed':
      return <svg {...common}><path d="M12 20v-7" /><path d="M12 13c-3.3 0-6-2.7-6-6 3.3 0 6 2.7 6 6z" /><path d="M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z" /></svg>
    case 'sprout':
      return <svg {...common}><path d="M12 21v-8" /><path d="M9 13c-2.2 0-4-1.8-4-4 2.2 0 4 1.8 4 4z" /><path d="M15 13c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4z" /></svg>
    case 'tree':
      return <svg {...common}><path d="M12 21v-4" /><path d="M7 17h10" /><path d="M8 17a4 4 0 118 0" /><path d="M9 11a3 3 0 116 0" /></svg>
    case 'support':
      return <svg {...common}><path d="M8 13l4 4 4-4" /><path d="M8 11a4 4 0 118-2" /></svg>
    case 'balance':
      return <svg {...common}><path d="M12 4v16" /><path d="M6 8h12" /><path d="M7 8l-3 5h6l-3-5z" /><path d="M17 8l-3 5h6l-3-5z" /></svg>
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></svg>
    case 'wave':
      return <svg {...common}><path d="M3 14c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 2-4" /></svg>
    case 'bell':
      return <svg {...common}><path d="M6 9a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 004 0" /></svg>
    case 'focus':
      return <svg {...common}><path d="M4 12h4" /><path d="M16 12h4" /><path d="M12 4v4" /><path d="M12 16v4" /><circle cx="12" cy="12" r="3" /></svg>
    case 'mic':
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
    case 'download':
      return <svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}
