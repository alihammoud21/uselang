import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { getMinutesRemaining } from '@shared/languages'
import { AppShell } from '@/components/AppShell'
import { useActiveSession } from '@/hooks/use-active-session'
import { APP_ROUTES } from '@/lib/routes'
import {
  createActiveSession,
  createDailyChallengeSession,
  createQuickFixSession,
  createStarterSession,
} from '@/lib/session-builders'

const QUICK_REQUESTS = [
  {
    title: 'Order at a cafe',
    detail: 'Coffee order, one preference, and a natural close.',
    prompt: 'How do I order at a cafe?',
  },
  {
    title: 'Find the bathroom',
    detail: 'Ask politely, clarify the direction, and close cleanly.',
    prompt: 'How do I ask where the bathroom is?',
  },
  {
    title: 'Introduce yourself',
    detail: 'Say your name, greet warmly, and add one personal detail.',
    prompt: 'How do I introduce myself?',
  },
]

async function requestVoiceTurn(body, idToken) {
  const response = await fetch('/.netlify/functions/voice-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const raw = await response.text()
  let payload = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { error: raw || 'Unable to build the lesson.' }
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to build the lesson.')
  }

  return payload
}

function formatMinutesRemaining(minutesRemaining) {
  if (minutesRemaining <= 0) return '0m left'
  if (minutesRemaining < 1) return `${Math.ceil(minutesRemaining * 60)}s left`
  return `${minutesRemaining.toFixed(1)}m left`
}

function getLaunchAccent(kind) {
  if (kind === 'daily') return 'bg-mint/12 text-mint'
  if (kind === 'quick_fix') return 'bg-amber/12 text-amber'
  return 'bg-accent/[0.08] text-accent'
}

export function LearningPage({ auth, route }) {
  const profile = useMemo(
    () =>
      auth.profile ?? {
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
  const inputRef = useRef(null)

  const minutesRemaining = getMinutesRemaining(profile)
  const lastSession = profile.sessionHistory?.[0] || null
  const continueSession = activeSession.session
  const quickFixSession = useMemo(
    () => (lastSession ? createQuickFixSession(profile, lastSession) : null),
    [lastSession, profile],
  )
  const dailyChallengeSession = useMemo(
    () => createDailyChallengeSession(profile.languageLearning || 'fr', profile.goal || 'general_interest'),
    [profile.goal, profile.languageLearning],
  )

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
            languageLearning: profile.languageLearning,
            goal: profile.goal,
            correctionIntensity: profile.correctionIntensity,
            confidenceLevel: profile.confidenceLevel,
          },
        },
        active.idToken,
      )

      if (result.profileSnapshot) {
        auth.applyServerProfile(result.profileSnapshot)
      }

      setDraft({
        request,
        lesson: result.customLesson,
        lessonBrief: result.lessonBrief,
        openingTurn: result,
      })
      setCustomRequest('')
    } catch (buildError) {
      setError(buildError.message)
    } finally {
      setBuildingLesson(false)
    }
  }

  function acceptDraft() {
    if (!draft?.lesson) return
    activeSession.save(
      createActiveSession(draft.lesson, {
        kind: 'custom',
        request: draft.request,
        turn: draft.openingTurn,
      }),
    )
    route.navigate(APP_ROUTES.trainer)
  }

  function launchSession(session) {
    activeSession.save(session)
    route.navigate(APP_ROUTES.trainer)
  }

  return (
    <AppShell auth={auth} route={route} section="home">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+3.45rem)] pb-4">
        <div className="flex items-center justify-between text-[0.72rem] font-medium text-ink/35">
          <span>{profile.languageLearning ? profile.languageLearning.toUpperCase() : 'LANG'}</span>
          <span>{formatMinutesRemaining(minutesRemaining)}</span>
        </div>
        <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-ink/[0.06]">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${Math.max(4, (minutesRemaining / 10) * 100)}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        <section
          className="relative overflow-hidden rounded-[2rem] px-5 py-6"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(255,196,221,0.22), transparent 28%), radial-gradient(circle at top right, rgba(0,122,255,0.14), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(246,249,255,0.92))',
            boxShadow: '0 18px 48px -28px rgba(15, 20, 25, 0.16)',
          }}
        >
          <div className="max-w-[16rem]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent/60">
              Home
            </p>
            <h1 className="mt-2 text-[2rem] font-bold leading-[1.02] tracking-[-0.05em] text-ink">
              Speak like a local.
            </h1>
            <p className="mt-2 text-[0.88rem] leading-snug text-ink/45">
              Start fast, fix one thing, or continue where you left off.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <StatPill label={`Level ${profile.level || 1}`} />
            <StatPill label={`${profile.xp || 0} XP`} />
            <StatPill label={`${profile.streakCount || 0} day streak`} />
          </div>

          <div className="pointer-events-none absolute -right-8 bottom-[-1.5rem] h-44 w-44 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.96),rgba(211,239,255,0.9)_22%,rgba(94,170,255,0.92)_62%,rgba(39,120,255,1)_100%)] opacity-85 blur-[2px]" />
        </section>

        <section className="mt-5 grid gap-3">
          <LaunchCard
            title={continueSession ? 'Continue last session' : 'Start your first session'}
            detail={
              continueSession
                ? `${continueSession.lesson?.scenarioMeta?.title || 'Pick up where you stopped'}`
                : 'Jump straight into a practical speaking session.'
            }
            meta={continueSession ? `Step ${(continueSession.stepIndex || 0) + 1}/${continueSession.lesson?.steps?.length || 1}` : 'One tap'}
            tone="accent"
            actionLabel={continueSession ? 'Continue' : 'Start now'}
            onClick={() =>
              continueSession
                ? route.navigate(APP_ROUTES.trainer)
                : launchSession(createStarterSession(profile.languageLearning || 'fr', profile.goal || 'general_interest'))
            }
          />

          <LaunchCard
            title="Daily speaking challenge"
            detail={dailyChallengeSession.lesson.scenarioMeta.tagline}
            meta="Quick win"
            tone="mint"
            actionLabel="Start challenge"
            onClick={() => launchSession(dailyChallengeSession)}
          />

          <LaunchCard
            title="Quick fix · 30 sec"
            detail={
              quickFixSession
                ? `Fix ${quickFixSession.lesson.steps[0].focus.toLowerCase()} before it sticks.`
                : 'No repeat problem word yet. Start speaking and this will fill in.'
            }
            meta={lastSession?.visualGuide?.word || 'Fast drill'}
            tone="amber"
            actionLabel="Fix it"
            disabled={!quickFixSession}
            onClick={() => quickFixSession && launchSession(quickFixSession)}
          />
        </section>

        <section
          className="mt-6 rounded-[1.8rem] bg-white/92 p-4"
          style={{ boxShadow: '0 14px 34px -24px rgba(15, 20, 25, 0.14)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-accent/60">
                Build my session
              </p>
              <p className="mt-1 text-[0.9rem] font-semibold text-ink">
                What do you need to say today?
              </p>
            </div>
            <div className="rounded-full bg-accent/[0.08] px-3 py-1.5 text-[0.7rem] font-medium text-accent">
              Custom
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <textarea
              ref={inputRef}
              value={customRequest}
              onChange={(event) => setCustomRequest(event.target.value)}
              rows={2}
              placeholder="What do you need to say today?"
              className="min-h-[3.8rem] flex-1 rounded-[1.1rem] bg-ink/[0.035] px-3.5 py-3 text-[0.92rem] font-medium leading-snug text-ink placeholder:text-ink/24"
            />
            <button
              type="button"
              onClick={() => buildLesson(customRequest)}
              disabled={!customRequest.trim() || buildingLesson}
              className="btn-primary shrink-0 self-stretch !px-4 !py-0 !text-[0.8rem] disabled:opacity-35"
            >
              {buildingLesson ? 'Building...' : 'Build'}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-ink/28">
              Example requests
            </p>
          </div>

          <div className="mt-3 grid gap-2.5">
            {QUICK_REQUESTS.map((item) => (
              <RequestExampleCard
                key={item.prompt}
                onClick={() => buildLesson(item.prompt)}
                title={item.title}
                detail={item.detail}
              />
            ))}
          </div>
        </section>

        <AnimatePresence>
          {draft?.lesson ? (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-5 rounded-[1.8rem] bg-white p-5"
              style={{ boxShadow: '0 16px 38px -26px rgba(15, 20, 25, 0.15)' }}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-accent/60">
                Plan preview
              </p>
              <h2 className="mt-2 text-[1.28rem] font-bold tracking-[-0.03em] text-ink">
                {draft.lessonBrief?.title || draft.lesson.scenarioMeta.title}
              </h2>
              <p className="mt-1 text-[0.8rem] leading-snug text-ink/42">
                {draft.lessonBrief?.sessionFocus || draft.lesson.scenarioMeta.tagline}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <PreviewPill>{draft.lessonBrief?.estimatedMinutes || draft.lesson.scenarioMeta.estimatedMinutes} min</PreviewPill>
                <PreviewPill>{draft.lessonBrief?.lines?.length || draft.lesson.steps.length} lines</PreviewPill>
                <PreviewPill>{draft.lesson.language.label}</PreviewPill>
              </div>

              <div className="mt-4 rounded-[1.2rem] bg-ink/[0.025] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                      Request
                    </p>
                    <p className="mt-1 text-[0.86rem] font-semibold leading-snug text-ink">
                      {draft.request}
                    </p>
                  </div>
                  <div className="rounded-full bg-accent/[0.08] px-3 py-1.5 text-[0.72rem] font-medium text-accent">
                    {draft.lesson.language.label}
                  </div>
                </div>
                <div className="mt-3 rounded-[1rem] bg-white px-3.5 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-accent/60">
                    Pronunciation focus
                  </p>
                  <p className="mt-1 text-[0.8rem] leading-snug text-ink/58">
                    {draft.lessonBrief?.pronunciationFocus || draft.lesson.steps[0]?.coachTip}
                  </p>
                  <p className="mt-2 text-[0.74rem] leading-snug text-ink/42">
                    Sound to watch: {draft.lessonBrief?.soundToWatch || draft.lesson.steps[0]?.soundHint}
                  </p>
                </div>
                <div className="mt-3 rounded-[1rem] bg-accent/[0.05] px-3.5 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-accent/60">
                    By the end
                  </p>
                  <p className="mt-1 text-[0.8rem] leading-snug text-ink/58">
                    {draft.lessonBrief?.outcome || draft.lesson.scenarioMeta.completionLine}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-ink/28">
                  What you will say in {draft.lesson.language.label}
                </p>
              </div>

              <div className="mt-4 space-y-2.5">
                {(draft.lessonBrief?.lines || []).map((line) => (
                  <div key={line.id} className="rounded-[1.2rem] bg-ink/[0.025] px-3.5 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.68rem] font-semibold text-ink/45">
                        {line.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                          {line.focus}
                        </p>
                        <p className="mt-1 text-[0.88rem] font-semibold leading-snug text-ink">
                          {line.targetText}
                        </p>
                        <p className="mt-1 text-[0.76rem] leading-snug text-ink/42">
                          {line.englishMeaning}
                        </p>
                        {line.whenToUseIt ? (
                          <p className="mt-1.5 text-[0.72rem] leading-snug text-ink/34">
                            {line.whenToUseIt}
                          </p>
                        ) : null}
                        {line.pronunciationFocus ? (
                          <p className="mt-1.5 text-[0.72rem] leading-snug text-accent/62">
                            {line.pronunciationFocus}
                          </p>
                        ) : null}
                        {line.soundToWatch ? (
                          <p className="mt-1 text-[0.7rem] leading-snug text-ink/34">
                            Sound to watch: {line.soundToWatch}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button type="button" onClick={acceptDraft} className="btn-primary flex-1 !py-3 !text-[0.82rem]">
                  Accept plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRequest(draft.request)
                    setDraft(null)
                    inputRef.current?.focus()
                  }}
                  className="btn-ghost flex-1 !py-3 !text-[0.82rem]"
                >
                  Edit
                </button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {lastSession ? (
          <section className="mt-6 rounded-[1.8rem] bg-white/90 p-4" style={{ boxShadow: '0 14px 32px -24px rgba(15, 20, 25, 0.14)' }}>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink/28">
              Last session
            </p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.94rem] font-semibold text-ink">{lastSession.focus || 'Recent practice'}</p>
                <p className="mt-1 text-[0.78rem] leading-snug text-ink/40">
                  {lastSession.explanation || lastSession.correctedPhrase}
                </p>
              </div>
              <span className="rounded-full bg-accent/[0.08] px-3 py-1.5 text-[0.72rem] font-semibold text-accent">
                {Math.round(Number(lastSession.accuracy || 0) * 100)}%
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-[1.2rem] bg-danger/8 px-4 py-3 text-[0.82rem] text-danger">
            {error}
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

function LaunchCard({ title, detail, meta, tone = 'accent', actionLabel, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full rounded-[1.8rem] bg-white/92 p-4 text-left disabled:opacity-45"
      style={{ boxShadow: '0 14px 34px -24px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.66rem] font-semibold ${getLaunchAccent(tone)}`}>
            {meta}
          </span>
          <p className="mt-3 text-[1rem] font-semibold tracking-[-0.02em] text-ink">{title}</p>
          <p className="mt-1 text-[0.78rem] leading-snug text-ink/42">{detail}</p>
        </div>
        <span className="mt-1 text-[0.74rem] font-semibold text-accent">{actionLabel}</span>
      </div>
    </button>
  )
}

function StatPill({ label }) {
  return (
    <span className="rounded-full bg-white/78 px-3 py-1.5 text-[0.72rem] font-medium text-ink/50">
      {label}
    </span>
  )
}

function PreviewPill({ children }) {
  return (
    <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[0.7rem] font-medium text-ink/45">
      {children}
    </span>
  )
}

function RequestExampleCard({ title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-[1.2rem] bg-ink/[0.03] px-3.5 py-3 text-left transition active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent/70" />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 pl-1.5">
          <p className="text-[0.8rem] font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-[0.7rem] leading-snug text-ink/38">{detail}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-medium text-accent">
          Use
        </span>
      </div>
    </button>
  )
}
