import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getMinutesRemaining, SUPPORTED_LANGUAGES } from '@shared/languages'
import { buildCustomLessonBundle, buildLessonBrief, getDailyChallengeBundle } from '@shared/lessons'
import { AISphere } from '@/components/AISphere'
import { AppShell } from '@/components/AppShell'
import { useActiveSession } from '@/hooks/use-active-session'
import { APP_ROUTES } from '@/lib/routes'
import { buildApiUrl } from '@/lib/runtime'
import { createActiveSession } from '@/lib/session-builders'

const SAND = '#c9a97a'
const SAND_BG = '#f5ede0'

const QUICK_REQUESTS = [
  { title: 'Café order', prompt: 'How do I order at a cafe?' },
  { title: 'Bathroom', prompt: 'How do I ask where the bathroom is?' },
  { title: 'Introductions', prompt: 'How do I introduce myself?' },
  { title: 'Directions', prompt: 'How do I ask for directions?' },
  { title: 'Train ticket', prompt: 'How do I buy a train ticket?' },
  { title: 'Hotel check-in', prompt: 'How do I check into a hotel?' },
]

async function requestVoiceTurn(body, idToken) {
  const response = await fetch(buildApiUrl('/api/voice-session'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const raw = await response.text()
  let payload = {}
  try { payload = raw ? JSON.parse(raw) : {} }
  catch { payload = { error: raw || 'Unable to build the lesson.' } }
  if (!response.ok) throw new Error(payload.error || 'Unable to build the lesson.')
  return payload
}

function formatMinutes(m) {
  if (m <= 0) return '0m left'
  if (m < 1) return `${Math.ceil(m * 60)}s left`
  return `${m.toFixed(1)}m left`
}

export function LearningPage({ auth, route }) {
  const profile = useMemo(
    () => auth.profile ?? {
      email: auth.session?.email || '',
      goal: 'general_interest',
      languageLearning: 'fr',
      nativeLanguage: 'en',
      minutesUsedToday: 0,
      streakCount: 0,
      xp: 0,
      level: 1,
    },
    [auth.profile, auth.session?.email],
  )
  const activeSession = useActiveSession()
  const [customRequest, setCustomRequest] = useState('')
  const [buildingLesson, setBuildingLesson] = useState(false)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [listenState, setListenState] = useState('idle')
  const inputRef = useRef(null)
  const inputRecognitionRef = useRef(null)

  const minutesRemaining = getMinutesRemaining(profile)
  const continueSession = activeSession.session
  const langCode = profile.languageLearning || 'fr'
  const language = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0],
    [langCode],
  )
  const dailyChallenge = useMemo(
    () => getDailyChallengeBundle(langCode, profile.goal || 'general_interest'),
    [langCode, profile.goal],
  )

  useEffect(() => {
    return () => inputRecognitionRef.current?.stop?.()
  }, [])

  function openTrainerWithVoiceIntent() {
    try {
      window.sessionStorage.setItem('uselang-trainer-intent', 'voice')
    } catch {
      // Ignore storage failures and still allow navigation.
    }
    route.navigate(APP_ROUTES.trainer)
  }

  async function buildLesson(requestText) {
    const request = String(requestText || '').trim()
    if (!request) return
    setBuildingLesson(true)
    setDraft(null)
    setError('')
    try {
      const active = await auth.getValidSession()
      const result = await requestVoiceTurn(
        {
          mode: 'build-lesson',
          request,
          lesson: {
            languageLearning: langCode,
            goal: profile.goal,
            correctionIntensity: profile.correctionIntensity,
            confidenceLevel: profile.confidenceLevel,
          },
        },
        active.idToken,
      )
      if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
      setDraft({ request, lesson: result.customLesson, lessonBrief: result.lessonBrief, openingTurn: result })
      setCustomRequest('')
    } catch (buildError) {
      const fallbackLesson = buildCustomLessonBundle(langCode, request, profile.goal || 'general_interest')
      if (fallbackLesson) {
        setDraft({
          request,
          lesson: fallbackLesson,
          lessonBrief: buildLessonBrief(fallbackLesson),
          openingTurn: null,
          localFallback: true,
        })
        setCustomRequest('')
        setError('')
      } else {
        setError(buildError.message)
      }
    } finally {
      setBuildingLesson(false)
    }
  }

  function acceptDraft() {
    if (!draft?.lesson) return
    activeSession.save(createActiveSession(draft.lesson, { kind: 'custom', request: draft.request, turn: draft.openingTurn }))
    route.navigate(APP_ROUTES.trainer)
  }

  function handleVoiceRequest() {
    const Recognition =
      typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setError('Voice requests are not available in this browser.')
      return
    }

    if (listenState === 'listening' && inputRecognitionRef.current) {
      inputRecognitionRef.current.stop()
      setListenState('idle')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListenState('listening')
    recognition.onend = () => setListenState('idle')
    recognition.onerror = () => {
      setListenState('idle')
      setError('Could not capture your request.')
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim()
      if (transcript) setCustomRequest(transcript)
      const last = event.results[event.results.length - 1]
      if (last?.isFinal && transcript) {
        recognition.stop()
        buildLesson(transcript)
      }
    }

    inputRecognitionRef.current = recognition
    recognition.start()
  }

  const firstName = (profile.email || '').split('@')[0] || 'there'
  const limitMins = profile.plan === 'pro' ? 30 : profile.plan === 'starter' ? 15 : 10
  const progressPct = Math.round(Math.max(0, Math.min(100, ((limitMins - minutesRemaining) / limitMins) * 100)))
  const isPro = profile.plan === 'pro' || profile.plan === 'paid'

  return (
    <AppShell auth={auth} route={route} section="home">
      {/* Slim usage bar */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.35rem)]">
        <div className="flex items-center justify-between text-[0.68rem] font-medium text-ink/30">
          <span className="tabular-nums">{progressPct}%</span>
          <span className="font-semibold text-ink/40">{language.label}</span>
          <span className="tabular-nums">{formatMinutes(minutesRemaining)}</span>
        </div>
        <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-black/[0.05]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: SAND }}
            animate={{ width: `${Math.max(3, progressPct)}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="px-5 pb-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: SAND }}>Lane</p>
          <h1 className="mt-1.5 text-[2rem] font-bold leading-[1.1] tracking-[-0.04em] text-ink">
            Hello, <span style={{ color: SAND }}>{firstName}</span>
          </h1>
          <p className="mt-1 text-[0.86rem] text-ink/38">
            What do you want to do today?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-4 grid grid-cols-2 gap-2.5"
        >
          <LaunchStrip
            eyebrow="Continue"
            title={continueSession ? continueSession.lesson?.scenarioMeta?.title || 'Last session' : 'Free practice'}
            detail={continueSession ? `Step ${(continueSession.stepIndex || 0) + 1} waiting` : 'Open the phrase studio'}
            onClick={() => route.navigate(APP_ROUTES.trainer)}
          />
          <LaunchStrip
            eyebrow="Today"
            title={dailyChallenge.scenarioMeta.tagline}
            detail={`${dailyChallenge.steps.length} quick lines`}
            onClick={() => {
              activeSession.save(createActiveSession(dailyChallenge, { kind: 'daily', request: 'Daily speaking challenge' }))
              route.navigate(APP_ROUTES.trainer)
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-6"
        >
          <div className="rounded-[2rem] bg-white/82 px-5 py-6 text-center" style={{ boxShadow: '0 20px 54px -32px rgba(120,95,60,0.16)' }}>
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
              style={{ background: `radial-gradient(circle, ${SAND_BG}, transparent 70%)` }}
            />
            <div className="relative flex justify-center">
              <AISphere
                state={listenState === 'listening' ? 'listening' : 'idle'}
                size={188}
                tone="accent"
                disabled={buildingLesson}
                onTap={openTrainerWithVoiceIntent}
                label=""
                hideLabel
              />
            </div>
            <button
              type="button"
              onClick={openTrainerWithVoiceIntent}
              className="mt-5 inline-flex min-w-[14rem] items-center justify-center rounded-[1.25rem] bg-[#1a1714] px-6 py-3.5 text-[0.92rem] font-semibold text-white shadow-[0_18px_40px_-24px_rgba(26,23,20,0.35)] transition active:scale-[0.98]"
            >
              {continueSession ? 'Continue session' : 'Start speaking'}
            </button>
            <p className="mt-2 text-[0.76rem] text-ink/38">
              {continueSession
                ? `${continueSession.lesson?.scenarioMeta?.title || 'Pick up where you left off'} · Step ${(continueSession.stepIndex || 0) + 1}`
                : 'Open the speaking coach, then type or talk.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <CompactAction
                title="Free practice"
                subtitle="Type or say any phrase"
                onClick={() => route.navigate(APP_ROUTES.trainer)}
                icon={<MicGlyph />}
              />
              <CompactAction
                title="Saved phrases"
                subtitle="Replay offline"
                onClick={() => route.navigate(APP_ROUTES.downloads)}
                icon={<DownloadGlyph />}
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[0.72rem] text-ink/34">
              <MiniStatus icon={<FireGlyph />} label={`${profile.streakCount || 0} day streak`} />
              <span>·</span>
              <MiniStatus icon={<BoltGlyph />} label={`${profile.xp || 0} XP`} />
              <span>·</span>
              <MiniStatus icon={<LevelGlyph />} label={`Level ${profile.level || 1}`} />
            </div>
          </div>
        </motion.div>

        {/* Build a lesson */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-4 rounded-[1.75rem] bg-white p-4"
          style={{ boxShadow: '0 12px 36px -18px rgba(201,169,122,0.18), 0 1px 3px rgba(15,20,25,0.04)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: `${SAND}18` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SAND} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <p className="text-[0.78rem] font-semibold text-ink">Build a lesson</p>
            </div>
            <button
              type="button"
              onClick={handleVoiceRequest}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                listenState === 'listening' ? 'bg-[#1a1714] text-white' : 'bg-black/[0.04] text-ink/46'
              }`}
            >
              <MicGlyph />
            </button>
          </div>
          <p className="mt-1.5 text-[0.8rem] text-ink/40">
            Tell Lane what you need to say. Type it or say it in English.
          </p>

          <div className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && customRequest.trim() && buildLesson(customRequest)}
              placeholder="e.g. I need to ask where the bathroom is"
              className="flex-1 rounded-[1rem] bg-black/[0.03] px-3.5 py-2.5 text-[0.86rem] font-medium text-ink placeholder:text-ink/22"
            />
            <button
              type="button"
              onClick={() => buildLesson(customRequest)}
              disabled={!customRequest.trim() || buildingLesson}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-30"
              style={{ background: '#1a1714', boxShadow: `0 4px 14px rgba(26,23,20,0.28)` }}
            >
              {buildingLesson ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <SuggestionPills onRequest={buildLesson} isLoading={buildingLesson} />
        </motion.section>

        {/* Draft preview */}
        <AnimatePresence>
          {draft?.lesson ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 rounded-[1.6rem] bg-white p-4"
              style={{ boxShadow: `0 14px 38px -24px rgba(201,169,122,0.2)` }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${SAND}18` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SAND} strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em]" style={{ color: SAND }}>
                  {draft.localFallback ? 'Plan ready locally' : 'Plan ready'}
                </p>
              </div>
              <h2 className="mt-2 text-[1.08rem] font-bold tracking-[-0.03em] text-ink">
                {draft.lessonBrief?.title || draft.lesson.scenarioMeta.title}
              </h2>
              <p className="mt-1 text-[0.78rem] leading-snug text-ink/42">
                {draft.lessonBrief?.sessionFocus || draft.lesson.scenarioMeta.tagline}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MiniMeta>{draft.lessonBrief?.estimatedMinutes || draft.lesson.scenarioMeta.estimatedMinutes} min</MiniMeta>
                <MiniMeta>{draft.lesson.steps.length} steps</MiniMeta>
                {draft.lessonBrief?.soundToWatch ? <MiniMeta>Sound focus</MiniMeta> : null}
              </div>
              <div className="mt-3 rounded-[1.1rem] bg-black/[0.025] p-3.5">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/26">
                  Outcome
                </p>
                <p className="mt-1 text-[0.8rem] leading-snug text-ink/56">
                  {draft.lessonBrief?.outcome || draft.lesson.scenarioMeta.completionLine}
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {(draft.lessonBrief?.lines || []).slice(0, 3).map((line) => (
                  <div key={line.id} className="rounded-[1.05rem] bg-[#fbfaf8] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em]" style={{ color: SAND }}>
                        Step {line.order}
                      </p>
                      {line.focus ? (
                        <span className="text-[0.68rem] font-medium text-ink/30">{line.focus}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[0.88rem] font-semibold leading-snug text-ink">{line.targetText}</p>
                    {line.englishMeaning ? (
                      <p className="mt-1 text-[0.76rem] leading-snug text-ink/42">{line.englishMeaning}</p>
                    ) : null}
                    {line.whenToUseIt ? (
                      <p className="mt-1.5 text-[0.7rem] leading-snug text-ink/34">Use it when: {line.whenToUseIt}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={acceptDraft} className="btn-warm flex-1 !py-2.5 !text-[0.8rem]">
                  Accept plan
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomRequest(draft.request); setDraft(null); inputRef.current?.focus() }}
                  className="btn-ghost flex-1 !py-2.5 !text-[0.8rem]"
                >
                  Edit
                </button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-[1rem] bg-danger/8 px-4 py-2.5 text-[0.8rem] text-danger"
          >
            {error}
          </motion.div>
        ) : null}

        {/* Upgrade nudge */}
        {!isPro ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="mt-3"
          >
            <UpgradeNudge minutesRemaining={minutesRemaining} onUpgrade={() => setShowUpgrade(true)} />
          </motion.div>
        ) : null}
      </div>

      <AnimatePresence>
        {showUpgrade ? <UpgradeSheetInline onClose={() => setShowUpgrade(false)} /> : null}
      </AnimatePresence>
    </AppShell>
  )
}

/* ─── Stat pill ─── */
function StatPill({ value, label, icon }) {
  return (
    <div
      className="flex flex-1 items-center gap-2 rounded-[1.1rem] bg-white px-3 py-2.5"
      style={{ boxShadow: '0 2px 12px -6px rgba(15,20,25,0.08)' }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.03] text-[#c9a97a]">{icon}</span>
      <div>
        <p className="text-[0.95rem] font-bold tracking-[-0.02em] text-ink leading-none">{value}</p>
        <p className="mt-0.5 text-[0.56rem] font-medium uppercase tracking-[0.04em] text-ink/28">{label}</p>
      </div>
    </div>
  )
}

function MiniMeta({ children }) {
  return (
    <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-[0.68rem] font-medium text-ink/45">
      {children}
    </span>
  )
}

function CompactAction({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.2rem] bg-[#fbfaf8] px-4 py-3 text-left transition active:scale-[0.98]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.03] text-[#c9a97a]">{icon}</span>
      <p className="mt-3 text-[0.82rem] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[0.7rem] text-ink/38">{subtitle}</p>
    </button>
  )
}

function LaunchStrip({ eyebrow, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.3rem] bg-white/78 px-4 py-3 text-left transition active:scale-[0.985]"
      style={{ boxShadow: '0 12px 28px -24px rgba(120,95,60,0.2)' }}
    >
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-ink/26">{eyebrow}</p>
      <p className="mt-1 text-[0.86rem] font-semibold leading-snug text-ink">{title}</p>
      <p className="mt-1 text-[0.72rem] text-ink/36">{detail}</p>
    </button>
  )
}

function MiniStatus({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[#c9a97a]">{icon}</span>
      <span>{label}</span>
    </span>
  )
}

function FireGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1.8 2 2.8 4 2.8 6.1A4.8 4.8 0 018.6 14c0-1.7.7-3.2 2-4.4 1.1-1.1 1.7-2.3 1.4-6.6z" />
      <path d="M9 15.4a3.4 3.4 0 106 2.6c0-1.4-.8-2.5-1.9-3.6-.9-.8-1.3-1.6-1.1-3.5-1.6 1.2-3 2.6-3 4.5z" />
    </svg>
  )
}

function BoltGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L5 14h5l-1 8 8-12h-5l1-8z" />
    </svg>
  )
}

function LevelGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v3a5 5 0 01-10 0V4z" />
      <path d="M7 6H5a2 2 0 000 4h2" />
      <path d="M17 6h2a2 2 0 010 4h-2" />
    </svg>
  )
}

function MicGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

function DownloadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

/* ─── Action card ─── */
function ActionCard({ title, subtitle, color, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.25rem] bg-white p-4 text-left transition active:scale-[0.98]"
      style={{ boxShadow: '0 2px 12px -6px rgba(15,20,25,0.08)' }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: color + '15', color }}
      >
        {icon}
      </span>
      <p className="mt-3 text-[0.82rem] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[0.68rem] text-ink/36">{subtitle}</p>
    </button>
  )
}

/* ─── Suggestion pills ─── */
function SuggestionPills({ onRequest, isLoading }) {
  const [active, setActive] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    timer.current = setInterval(() => setActive((i) => (i + 1) % QUICK_REQUESTS.length), 3000)
    return () => clearInterval(timer.current)
  }, [])

  return (
    <div className="mt-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {QUICK_REQUESTS.map((item, i) => (
          <motion.button
            key={item.prompt}
            type="button"
            onClick={() => { clearInterval(timer.current); setActive(i) }}
            animate={{
              backgroundColor: i === active ? SAND + '14' : 'rgba(255,255,255,0.9)',
              borderColor: i === active ? SAND + '40' : 'rgba(15,20,25,0.06)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="flex shrink-0 rounded-full border px-3 py-1.5 text-[0.72rem] font-medium"
            style={{ color: i === active ? SAND : 'rgba(15,20,25,0.45)' }}
          >
            {item.title}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-center justify-between rounded-[1.1rem] px-3.5 py-3"
          style={{ background: SAND + '10' }}
        >
          <p className="text-[0.8rem] font-medium text-ink/65">{QUICK_REQUESTS[active].prompt}</p>
          <button
            type="button"
            onClick={() => !isLoading && onRequest(QUICK_REQUESTS[active].prompt)}
            disabled={isLoading}
            className="ml-2 shrink-0 text-[0.74rem] font-semibold disabled:opacity-40"
            style={{ color: SAND }}
          >
            {isLoading ? '...' : 'Use →'}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ─── Upgrade nudge ─── */
function UpgradeNudge({ minutesRemaining, onUpgrade }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="upgrade-card w-full rounded-[1.6rem] p-4 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-white">
            {minutesRemaining <= 1 ? 'Almost out' : 'Upgrade'}
          </span>
          <p className="mt-2 text-[1.02rem] font-bold tracking-[-0.02em] text-white">Unlock unlimited speaking</p>
          <p className="mt-0.5 text-[0.74rem] text-white/65">No daily cap. Offline AI. All features.</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        {['Unlimited', '7-day trial', 'Offline AI'].map((f) => (
          <span key={f} className="upgrade-card-frost rounded-full px-2.5 py-1 text-[0.62rem] font-medium text-white">{f}</span>
        ))}
      </div>
    </button>
  )
}

/* ─── Upgrade sheet ─── */
function UpgradeSheetInline({ onClose }) {
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
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white/60">Lane Pro</p>
          <h2 className="mt-1.5 text-[1.4rem] font-bold tracking-[-0.04em]">Speak without limits</h2>
          <p className="mt-1 text-[0.8rem] text-white/65">Unlimited AI coaching. Every feature unlocked.</p>
        </div>
        <div className="mt-3 space-y-2 px-4">
          {[
            'Unlimited speaking sessions daily',
            'Offline phrase library — unlimited saves',
            'Advanced pronunciation analytics',
            'All 6 languages with native voices',
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 rounded-[1rem] bg-ink/[0.03] px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-[0.78rem] font-medium text-ink">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2.5 px-4">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className="relative flex-1 rounded-[1.25rem] border-[1.5px] px-3.5 py-3 text-left transition"
              style={{
                borderColor: selected === plan.id ? '#22c55e' : 'rgba(15,20,25,0.08)',
                background: selected === plan.id ? 'rgba(34,197,94,0.05)' : '#fff',
              }}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2.5 py-0.5 text-[0.58rem] font-bold text-white whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <p className="text-[0.72rem] font-semibold" style={{ color: selected === plan.id ? '#22c55e' : 'rgba(15,20,25,0.4)' }}>
                {plan.label}
              </p>
              <p className="mt-0.5 text-[1.1rem] font-bold tracking-[-0.03em] text-ink">{plan.price}</p>
              <p className="text-[0.66rem] text-ink/35">{plan.period}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 px-4">
          <button type="button" className="btn-primary w-full !py-3.5 !text-[0.88rem]" style={{ boxShadow: '0 12px 32px -8px rgba(34,197,94,0.4)' }}>
            Start 7-day free trial
          </button>
          <p className="mt-2 text-center text-[0.67rem] text-ink/30">Cancel anytime. No charge during trial.</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <button type="button" className="text-[0.67rem] text-ink/28">Restore</button>
            <span className="text-ink/15">·</span>
            <button type="button" className="text-[0.67rem] text-ink/28">Privacy</button>
            <span className="text-ink/15">·</span>
            <button type="button" className="text-[0.67rem] text-ink/28">Terms</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
