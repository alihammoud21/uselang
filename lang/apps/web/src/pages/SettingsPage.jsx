import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CONFIDENCE_LEVELS,
  CORRECTION_INTENSITY,
  GOAL_OPTIONS,
  SUPPORTED_LANGUAGES,
  TUTOR_STYLE_OPTIONS,
} from '@shared/languages'
import { AppShell, AppHeader } from '@/components/AppShell'
import { APP_ROUTES } from '@/lib/routes'
const LEARNING_GOALS = [
  { id: 'travel', label: 'Travel' },
  { id: 'work', label: 'Business' },
  { id: 'family', label: 'Family' },
  { id: 'school', label: 'School' },
  { id: 'general_interest', label: 'General' },
]

export function SettingsPage({ auth, route }) {
  const profile = auth.profile ?? {
    languageLearning: 'en',
    nativeLanguage: 'en',
    goal: 'general_interest',
    confidenceLevel: 'beginner',
    tutorStyle: 'balanced',
    voiceSpeed: 1,
    correctionIntensity: 'balanced',
    sayLikeLocal: true,
  }
  const formKey = [
    profile.languageLearning, profile.nativeLanguage, profile.goal,
    profile.confidenceLevel, profile.tutorStyle, profile.voiceSpeed,
    profile.correctionIntensity, profile.sayLikeLocal,
  ].join(':')
  return <SettingsForm key={formKey} auth={auth} route={route} />
}

function SettingsForm({ auth, route }) {
  const profile = auth.profile ?? {
    languageLearning: 'en',
    nativeLanguage: 'en',
    goal: 'general_interest',
    confidenceLevel: 'beginner',
    tutorStyle: 'balanced',
    voiceSpeed: 1,
    correctionIntensity: 'balanced',
    sayLikeLocal: true,
  }
  const [form, setForm] = useState(() => ({
    languageLearning: profile.languageLearning,
    nativeLanguage: profile.nativeLanguage,
    goal: profile.goal,
    confidenceLevel: profile.confidenceLevel,
    tutorStyle: profile.tutorStyle,
    voiceSpeed: profile.voiceSpeed || 1,
    correctionIntensity: profile.correctionIntensity,
    sayLikeLocal: profile.sayLikeLocal ?? true,
  }))
  const [saved, setSaved] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const isPro = profile.plan === 'pro' || profile.plan === 'paid'

  function update(key, value) {
    setSaved(false)
    setForm((c) => ({ ...c, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await auth.updateProfile(form)
    setSaved(true)
  }

  return (
    <AppShell
      auth={auth}
      route={route}
      section="settings"
      header={<AppHeader title="Settings" subtitle="Customize your experience." />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-4">
        <section
          className="relative overflow-hidden rounded-[1.8rem] bg-white/92 p-5"
          style={{ boxShadow: '0 18px 44px -24px rgba(15, 20, 25, 0.16)' }}
        >
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.05em]" style={{ color: '#c9a97a' }}>
            Your tutor setup
          </p>
          <h2 className="mt-2 text-[1.18rem] font-bold tracking-[-0.03em] text-ink">
            Tune the experience once, then speak
          </h2>
          <p className="mt-1 max-w-[17rem] text-[0.8rem] leading-snug text-ink/42">
            Guidance stays in your language. Practice audio stays in the target language with a native voice.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SummaryPill label={`Learning ${getLanguageLabel(form.languageLearning)}`} />
            <SummaryPill label={`Native ${getLanguageLabel(form.nativeLanguage)}`} />
            <SummaryPill label={getGoalLabel(form.goal)} />
            <SummaryPill label={getTutorStyleLabel(form.tutorStyle)} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile label="Pace" value={`${Number(form.voiceSpeed).toFixed(2)}x`} />
            <MetricTile label="Corrections" value={getCorrectionLabel(form.correctionIntensity)} />
            <MetricTile label="Guide language" value={getLanguageLabel(form.nativeLanguage)} />
          </div>
        </section>

        <SettingsGroup title="Languages">
          <OptionGrid
            label="I'm learning"
            value={form.languageLearning}
            onChange={(v) => update('languageLearning', v)}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
          <OptionGrid
            label="Guide me in"
            value={form.nativeLanguage}
            onChange={(v) => update('nativeLanguage', v)}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
          <div className="rounded-[1rem] bg-ink/[0.03] px-3.5 py-3">
            <p className="text-[0.72rem] font-medium text-ink/40">Voice output</p>
            <p className="mt-1 text-[0.8rem] leading-snug text-ink/56">
              Guide audio uses your guide language when available. Practice playback stays in {getLanguageLabel(form.languageLearning)} with a native voice for that language.
            </p>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Learning goal">
          <div className="grid grid-cols-2 gap-2">
            {LEARNING_GOALS.map((g) => {
              const active = form.goal === g.id
              return (
                <button key={g.id} type="button" onClick={() => update('goal', g.id)}
                  className={`flex items-center gap-3 rounded-[1rem] px-3 py-3 text-left transition ${active ? 'ring-1 ring-[#c9a97a]/30 bg-[#f5ede0]' : 'bg-[#faf7f2]'}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-[#c9a97a] text-white' : 'bg-white text-ink/40'}`}>
                    <GoalGlyph goalId={g.id} />
                  </span>
                  <p className={`text-[0.76rem] font-medium ${active ? 'text-[#c9a97a]' : 'text-ink/50'}`}>{g.label}</p>
                </button>
              )
            })}
          </div>
        </SettingsGroup>

        <SettingsGroup title="Coach style">
          <ChoiceRow items={TUTOR_STYLE_OPTIONS} value={form.tutorStyle} onChange={(v) => update('tutorStyle', v)} />
        </SettingsGroup>

        <SettingsGroup title="Your level">
          <ChoiceRow items={CONFIDENCE_LEVELS} value={form.confidenceLevel} onChange={(v) => update('confidenceLevel', v)} />
        </SettingsGroup>

        <SettingsGroup title="Coaching">
          <div className="px-1">
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] text-ink/50">Speech speed</span>
              <span className="text-[0.78rem] font-semibold tabular-nums text-ink">{Number(form.voiceSpeed).toFixed(2)}x</span>
            </div>
            <input
              type="range" min="0.6" max="1.2" step="0.05"
              value={form.voiceSpeed}
              onChange={(e) => update('voiceSpeed', Number(e.target.value))}
              className="mt-3 w-full"
            />
            <div className="mt-1 flex justify-between text-[0.62rem] text-ink/20">
              <span>Slower</span><span>Natural</span><span>Faster</span>
            </div>
            <p className="mt-2 text-[0.68rem] text-ink/30">Auto-adjusts based on your skill over time.</p>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[0.78rem] text-ink/50">Correction intensity</p>
            <ChoiceRow items={CORRECTION_INTENSITY} value={form.correctionIntensity} onChange={(v) => update('correctionIntensity', v)} />
          </div>

          <div className="rounded-[1rem] bg-ink/[0.03] px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.78rem] font-medium text-ink/55">Phrase style</p>
                <p className="mt-1 text-[0.72rem] leading-snug text-ink/38">
                  Pick whether trainer gives you the most local phrasing or the safer textbook version.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('sayLikeLocal', !form.sayLikeLocal)}
                className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium ${form.sayLikeLocal ? 'bg-[#f5ede0] text-[#c9a97a]' : 'bg-white text-ink/45'}`}
              >
                {form.sayLikeLocal ? 'Local phrasing' : 'Textbook'}
              </button>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Offline and downloads">
          <div className="grid gap-2">
            <div className="rounded-[1rem] bg-[#faf7f2] px-3.5 py-3">
              <p className="text-[0.78rem] font-medium text-ink/55">Offline behavior</p>
              <p className="mt-1 text-[0.72rem] leading-snug text-ink/38">
                Saved phrases, homework prompts, and downloaded coach audio stay available when the live tutor is offline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => route.navigate(APP_ROUTES.downloads)}
              className="flex items-center justify-between rounded-[1rem] bg-[#faf7f2] px-3.5 py-3 text-left"
            >
              <div>
                <p className="text-[0.78rem] font-medium text-ink/55">Download management</p>
                <p className="mt-1 text-[0.72rem] leading-snug text-ink/38">
                  Open Library to replay, remove, and keep saved phrases ready offline.
                </p>
              </div>
              <span className="text-[0.72rem] font-semibold text-[#c9a97a]">Open</span>
            </button>
          </div>
        </SettingsGroup>

        {!isPro ? (
          <SettingsGroup title="Subscription">
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="upgrade-card w-full rounded-[1.25rem] p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-white">
                    Upgrade
                  </span>
                  <p className="mt-2 text-[0.95rem] font-bold text-white">Lane Pro</p>
                  <p className="mt-0.5 text-[0.74rem] text-white/65">Unlimited sessions, all features.</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {['Unlimited', '7-day trial', 'Cancel anytime'].map((f) => (
                  <span key={f} className="upgrade-card-frost rounded-full px-2.5 py-1 text-[0.62rem] font-medium text-white">
                    {f}
                  </span>
                ))}
              </div>
            </button>
          </SettingsGroup>
        ) : (
          <SettingsGroup title="Subscription">
            <div className="rounded-[1.25rem] px-4 py-3.5" style={{ background: '#f5ede0' }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#c9a97a22', color: '#c9a97a' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-[0.82rem] font-semibold" style={{ color: '#c9a97a' }}>Lane Pro — Active</p>
                  <p className="text-[0.7rem] text-ink/38">All features unlocked. No daily limits.</p>
                </div>
              </div>
            </div>
          </SettingsGroup>
        )}

        {auth.error ? (
          <div className="rounded-xl bg-danger/8 px-4 py-3 text-[0.78rem] text-danger">{auth.error}</div>
        ) : null}

        {/* actions */}
        <div className="grid gap-2">
          <button type="submit" disabled={auth.busy} className="btn-warm w-full">
            {auth.busy ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => { auth.signOut(); route.navigate('/login') }}
            className="w-full rounded-[0.875rem] py-3 text-[0.82rem] font-medium text-danger transition active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showUpgrade ? <SettingsUpgradeSheet onClose={() => setShowUpgrade(false)} /> : null}
      </AnimatePresence>
    </AppShell>
  )
}

function SettingsGroup({ title, children }) {
  return (
    <section className="rounded-[1.55rem] bg-white/88 p-4" style={{ boxShadow: '0 14px 36px -22px rgba(15, 20, 25, 0.14)' }}>
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-ink/25">{title}</p>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function OptionGrid({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-[0.72rem] font-medium text-ink/35">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-[1rem] px-3 py-2.5 text-left text-[0.78rem] font-medium transition ${
                active ? 'bg-[#f5ede0] text-[#c9a97a] ring-1 ring-[#c9a97a]/20' : 'bg-[#faf7f2] text-ink/54'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ChoiceRow({ items, value, onChange }) {
  return (
    <div className="grid gap-1.5">
      {items.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition ${
              active ? 'bg-[#f5ede0]' : 'bg-ink/[0.025]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[0.8rem] font-medium text-ink">{option.label}</p>
              {option.detail ? <p className="mt-0.5 text-[0.68rem] text-ink/35">{option.detail}</p> : null}
            </div>
            {active ? <Checkmark /> : null}
          </button>
        )
      })}
    </div>
  )
}

function Checkmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0" style={{ color: '#c9a97a' }}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

function SummaryPill({ label }) {
  return (
    <span className="rounded-full bg-ink/[0.04] px-3 py-1.5 text-[0.72rem] font-medium text-ink/50">
      {label}
    </span>
  )
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-[1rem] bg-ink/[0.035] px-3 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.05em] text-ink/24">{label}</p>
      <p className="mt-1 text-[0.78rem] font-semibold leading-snug text-ink/58">{value}</p>
    </div>
  )
}

function getLanguageLabel(code) {
  return SUPPORTED_LANGUAGES.find((item) => item.code === code)?.label || 'Not set'
}

function getGoalLabel(code) {
  return GOAL_OPTIONS.find((item) => item.id === code)?.label || 'Goal'
}

function getTutorStyleLabel(code) {
  return TUTOR_STYLE_OPTIONS.find((item) => item.id === code)?.label || 'Coach'
}

function getCorrectionLabel(code) {
  return CORRECTION_INTENSITY.find((item) => item.id === code)?.label || 'Balanced'
}

function SettingsUpgradeSheet({ onClose }) {
  const PLANS = [
    { id: 'monthly', label: 'Monthly', price: '$9.99', period: '/month', badge: null },
    { id: 'yearly', label: 'Yearly', price: '$59.99', period: '/year', badge: 'Save 50%' },
  ]
  const [selected, setSelected] = useState('yearly')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] overflow-hidden rounded-t-[2rem] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full bg-ink/10" />
        </div>
        <div className="upgrade-card mx-4 mt-2 rounded-[1.5rem] px-5 py-5 text-white">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-white/65">Lane Pro</p>
          <h2 className="mt-1.5 text-[1.5rem] font-bold tracking-[-0.04em] text-white">Speak without limits</h2>
          <p className="mt-1 text-[0.82rem] text-white/70">Unlimited AI coaching. No daily cap. Every feature unlocked.</p>
        </div>
        <div className="mt-4 flex gap-2.5 px-4">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`relative flex-1 rounded-[1.25rem] border-[1.5px] px-3.5 py-3 text-left transition ${
                selected === plan.id ? 'border-accent bg-accent/[0.06]' : 'border-ink/[0.08] bg-white'
              }`}
            >
              {plan.badge ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2.5 py-0.5 text-[0.6rem] font-bold text-white">
                  {plan.badge}
                </span>
              ) : null}
              <p className={`text-[0.72rem] font-semibold ${selected === plan.id ? 'text-accent' : 'text-ink/40'}`}>{plan.label}</p>
              <p className="mt-0.5 text-[1.15rem] font-bold tracking-[-0.03em] text-ink">{plan.price}</p>
              <p className="text-[0.68rem] text-ink/35">{plan.period}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 px-4">
          <button
            type="button"
            className="btn-primary w-full !py-3.5 !text-[0.88rem]"
            style={{ boxShadow: '0 12px 32px -8px rgba(34, 197, 94, 0.4)' }}
          >
            Start 7-day free trial
          </button>
          <p className="mt-2 text-center text-[0.68rem] text-ink/32">Cancel anytime. No charge during trial.</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button type="button" className="text-[0.68rem] text-ink/30">Restore purchase</button>
            <span className="text-ink/15">·</span>
            <button type="button" className="text-[0.68rem] text-ink/30">Privacy</button>
            <span className="text-ink/15">·</span>
            <button type="button" className="text-[0.68rem] text-ink/30">Terms</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function GoalGlyph({ goalId }) {
  if (goalId === 'travel') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    )
  }
  if (goalId === 'work') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    )
  }
  if (goalId === 'family') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    )
  }
  if (goalId === 'school') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-4 9 4-9 4-9-4z" />
        <path d="M7 10.5v4.5c0 1.8 2.2 3 5 3s5-1.2 5-3v-4.5" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  )
}
