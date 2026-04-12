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

const STEP_TRANSITION = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25 },
}

const STEP_META = {
  languageLearning: { eyebrow: 'Target language', accent: 'text-accent' },
  nativeLanguage: { eyebrow: 'Guide language', accent: 'text-violet' },
  goal: { eyebrow: 'Motivation', accent: 'text-mint' },
  confidenceLevel: { eyebrow: 'Current level', accent: 'text-amber' },
  tutorStyle: { eyebrow: 'Coach style', accent: 'text-accent' },
  correctionIntensity: { eyebrow: 'Correction feel', accent: 'text-danger' },
}

export function OnboardingPage({ auth, route }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [dismissedInstall, setDismissedInstall] = useState(false)
  const [form, setForm] = useState(() => ({
    languageLearning: auth.profile?.languageLearning || '',
    nativeLanguage: auth.profile?.nativeLanguage || '',
    goal: auth.profile?.goal || '',
    confidenceLevel: auth.profile?.confidenceLevel || '',
    tutorStyle: auth.profile?.tutorStyle || '',
    correctionIntensity: auth.profile?.correctionIntensity || 'balanced',
  }))

  const steps = useMemo(
    () => [
      {
        id: 'welcome',
        type: 'welcome',
        title: 'Welcome to UseLang',
        detail: 'Set up your tutor in under a minute. Then you can start speaking right away.',
      },
      {
        id: 'languageLearning',
        title: 'What language do you want to learn?',
        options: SUPPORTED_LANGUAGES.map((l) => ({ id: l.code, title: l.label })),
      },
      {
        id: 'nativeLanguage',
        title: 'What language do you speak most?',
        options: SUPPORTED_LANGUAGES.map((l) => ({ id: l.code, title: l.label })),
      },
      {
        id: 'goal',
        title: 'Why are you learning?',
        options: GOAL_OPTIONS.map((g) => ({ id: g.id, title: g.label, detail: g.detail })),
      },
      {
        id: 'confidenceLevel',
        title: 'How confident are you right now?',
        options: CONFIDENCE_LEVELS.map((o) => ({ id: o.id, title: o.label, detail: o.detail })),
      },
      {
        id: 'tutorStyle',
        title: 'How should the coach behave?',
        options: TUTOR_STYLE_OPTIONS.map((o) => ({ id: o.id, title: o.label, detail: o.detail })),
      },
      {
        id: 'correctionIntensity',
        title: 'How strict should corrections be?',
        options: CORRECTION_INTENSITY.map((o) => ({ id: o.id, title: o.label, detail: o.detail })),
      },
    ],
    [],
  )

  const isInstallStep = stepIndex === steps.length
  const currentStep = steps[stepIndex]
  const isWelcomeStep = currentStep?.type === 'welcome'
  const isLanguageStep =
    currentStep?.id === 'languageLearning' || currentStep?.id === 'nativeLanguage'
  const currentValue = currentStep && !isWelcomeStep ? form[currentStep.id] : null
  const canContinue = isInstallStep || isWelcomeStep ? true : Boolean(currentValue)
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

  return (
    <div className="app-stage min-h-screen">
      <div className="phone-shell flex flex-col">
        {/* progress header */}
        <div className="relative z-10 px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-ink/40 disabled:opacity-25"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
            <span className="text-[0.7rem] font-medium tabular-nums text-ink/25">{stepIndex + 1}/{totalSteps}</span>
          </div>
        </div>

        {/* content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-6 pt-8">
          <AnimatePresence mode="wait">
            {isInstallStep ? (
              <motion.section key="install" {...STEP_TRANSITION} className="space-y-5">
                <div>
                  <h1 className="text-[1.8rem] font-bold leading-tight tracking-[-0.03em] text-ink">
                    Add UseLang to your home screen.
                  </h1>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-ink/45">
                    Opens full screen. Feels like a real app.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="space-y-3">
                    {[
                      'Open the browser share menu.',
                      'Choose Add to Home Screen.',
                      'Launch from your home screen.',
                    ].map((item, index) => (
                      <div key={item} className="flex gap-3 rounded-xl bg-ink/[0.025] px-3 py-2.5">
                        <span className="text-[0.82rem] font-bold text-accent">{index + 1}</span>
                        <p className="text-[0.82rem] text-ink/55">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {!dismissedInstall ? (
                  <button type="button" onClick={() => setDismissedInstall(true)} className="text-[0.78rem] text-ink/30 underline underline-offset-4">
                    Skip for now
                  </button>
                ) : null}
              </motion.section>
            ) : (
              <motion.section key={currentStep.id} {...STEP_TRANSITION}>
                {isWelcomeStep ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent">
                        Personalization
                      </p>
                      <h1 className="mt-3 text-[1.9rem] font-bold leading-tight tracking-[-0.03em] text-ink">
                        {currentStep.title}
                      </h1>
                      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink/45">
                        {currentStep.detail}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div
                        className="relative flex h-32 w-32 items-center justify-center rounded-full"
                        style={{
                          background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.92) 0%, rgba(188,216,255,0.55) 48%, rgba(0,122,255,0.35) 100%)',
                          boxShadow: '0 30px 64px -30px rgba(0,122,255,0.28)',
                        }}
                      >
                        <div className="absolute inset-[12%] rounded-full border border-white/70" />
                      </div>
                    </div>

                    <div
                      className="relative overflow-hidden rounded-[1.6rem] bg-white p-5"
                      style={{ boxShadow: '0 16px 38px -24px rgba(15, 20, 25, 0.15)' }}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.14),transparent_42%),radial-gradient(circle_at_top_left,rgba(255,178,208,0.18),transparent_42%)]" />
                      <div className="space-y-3">
                        {[
                          'Pick the language you speak and the language you want to learn.',
                          'Choose your goal, confidence level, and tutor style.',
                          'Set how strict the corrections should feel.',
                        ].map((item) => (
                          <div key={item} className="flex gap-3 rounded-xl bg-ink/[0.025] px-3 py-3">
                            <span className="mt-0.5 h-2 w-2 rounded-full bg-accent" />
                            <p className="text-[0.8rem] leading-snug text-ink/55">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative overflow-hidden rounded-[1.55rem] bg-white/92 p-4" style={{ boxShadow: '0 18px 38px -24px rgba(15, 20, 25, 0.16)' }}>
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(255,178,208,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(0,122,255,0.12),transparent_36%)]" />
                      <p className={`relative text-[0.68rem] font-semibold uppercase tracking-[0.05em] ${STEP_META[currentStep.id]?.accent || 'text-accent/55'}`}>
                        {STEP_META[currentStep.id]?.eyebrow || 'Personalization'}
                      </p>
                      <h1 className="relative mt-2 text-[1.7rem] font-bold leading-tight tracking-[-0.04em] text-ink">
                        {currentStep.title}
                      </h1>
                      <p className="relative mt-2 text-[0.82rem] leading-snug text-ink/38">
                        Pick the option that feels most natural right now. You can change it later in Settings.
                      </p>
                    </div>

                    <div className={`mt-5 grid gap-2.5 ${isLanguageStep ? 'grid-cols-2' : ''}`}>
                      {currentStep.options.map((option) => {
                        const active = currentValue === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setForm((c) => ({ ...c, [currentStep.id]: option.id }))}
                            className={`relative flex items-center justify-between overflow-hidden rounded-[1.25rem] px-4 py-4 text-left transition ${
                              active ? 'bg-accent/[0.06] ring-1 ring-accent/24' : 'bg-white'
                            }`}
                            style={{ boxShadow: active ? '0 18px 38px -24px rgba(0,122,255,0.24)' : '0 14px 32px -24px rgba(15, 20, 25, 0.14)' }}
                          >
                            {active ? (
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[radial-gradient(circle_at_top_left,rgba(0,122,255,0.12),transparent_48%)]" />
                            ) : null}
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? 'bg-accent text-white' : 'bg-ink/[0.04] text-ink/34'}`}>
                                <OptionGlyph stepId={currentStep.id} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.88rem] font-medium text-ink">{option.title}</p>
                                {option.detail ? <p className="mt-0.5 text-[0.72rem] text-ink/40">{option.detail}</p> : null}
                              </div>
                            </div>
                            {active ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-accent shrink-0">
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* footer */}
        <div className="relative z-10 border-t border-ink/[0.04] px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div className="rounded-[1.45rem] bg-white/88 p-2.5" style={{ boxShadow: '0 10px 28px -20px rgba(15, 20, 25, 0.16)' }}>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || auth.busy}
              className="btn-primary w-full"
            >
              {auth.busy ? 'Saving...' : isInstallStep ? 'Get started' : isWelcomeStep ? "Let's personalize it" : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OptionGlyph({ stepId }) {
  if (stepId === 'languageLearning' || stepId === 'nativeLanguage') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h8" />
        <path d="M4 9h6" />
        <path d="M13 5h7" />
        <path d="M15 19l3.5-9 3.5 9" />
        <path d="M16.5 16h4" />
      </svg>
    )
  }
  if (stepId === 'goal') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-6" />
      </svg>
    )
  }
  if (stepId === 'confidenceLevel') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12a8 8 0 0116 0" />
        <path d="M12 12l4-4" />
      </svg>
    )
  }
  if (stepId === 'tutorStyle') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0014 0" />
        <path d="M12 18v3" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.5 15.1a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-.9 1.5v.2a2 2 0 11-4 0v-.2a1.6 1.6 0 00-.9-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-.9H3a2 2 0 110-4h.2a1.6 1.6 0 001.5-.9 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3 1.6 1.6 0 00.9-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 00.9 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5.9h.2a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5.9z" />
    </svg>
  )
}
