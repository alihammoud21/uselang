import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { AppShell, AppHeader } from '@/components/AppShell'
import { SessionCard } from '@/components/SessionCard'
import { useActiveSession } from '@/hooks/use-active-session'
import { APP_ROUTES } from '@/lib/routes'
import { createQuickFixSession } from '@/lib/session-builders'

/* ─── pronunciation sounds for heatmap ─── */
const SOUND_MAP = [
  { sound: 'R', label: 'R sound' },
  { sound: 'U', label: 'U vowel' },
  { sound: 'Nasal', label: 'Nasal' },
  { sound: 'TH', label: 'TH sound' },
  { sound: 'L', label: 'L sound' },
  { sound: 'V/B', label: 'V vs B' },
  { sound: 'Stress', label: 'Word stress' },
  { sound: 'Flow', label: 'Sentence flow' },
]

/* ─── levels ─── */
const LEVELS = [
  { id: 'beginner', label: 'Beginner', min: 0, max: 40, color: 'text-ink/40', bg: 'bg-ink/[0.06]' },
  { id: 'tourist', label: 'Tourist', min: 40, max: 60, color: 'text-amber', bg: 'bg-amber/10' },
  { id: 'conversational', label: 'Conversational', min: 60, max: 80, color: 'text-accent', bg: 'bg-accent/10' },
  { id: 'fluent', label: 'Fluent', min: 80, max: 100, color: 'text-mint', bg: 'bg-mint/10' },
]

function getLevel(accuracy) {
  const pct = Math.round(accuracy * 100)
  return LEVELS.find((l) => pct >= l.min && pct < l.max) || LEVELS[LEVELS.length - 1]
}

function formatRelative(dateString) {
  if (!dateString) return ''
  const then = new Date(dateString).getTime()
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(then)
}

export function HistoryPage({ auth, route }) {
  const profile = auth.profile ?? {
    streakCount: 0,
    longestStreak: 0,
    xp: 0,
    level: 1,
    confidenceScore: 48,
  }
  const [sessions, setSessions] = useState(() => auth.profile?.sessionHistory || [])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showAllSessions, setShowAllSessions] = useState(false)
  const activeSession = useActiveSession()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const nextSessions = await auth.loadHistory()
        if (!active) return
        startTransition(() => setSessions(nextSessions))
      } catch (historyError) {
        if (active) setError(historyError.message)
      }
    }
    load()
    return () => { active = false }
  }, [auth])

  const metrics = useMemo(() => {
    const totalSessions = sessions.length
    const accuracies = sessions.map((s) => Number(s.accuracy || 0))
    const averageAccuracy = totalSessions ? accuracies.reduce((a, b) => a + b, 0) / totalSessions : 0
    const recentTrend = sessions.slice(0, 8).reverse().map((s) => Number(s.accuracy || 0))
    const trendDelta = recentTrend.length >= 2 ? recentTrend[recentTrend.length - 1] - recentTrend[0] : 0
    const strongPasses = sessions.filter((s) => Number(s.accuracy || 0) >= 0.88).length
    const totalTurns = totalSessions
    const weekSessions = sessions.slice(0, 7)
    const weekAccuracy = weekSessions.length
      ? weekSessions.reduce((sum, s) => sum + Number(s.accuracy || 0), 0) / weekSessions.length
      : 0
    const weekImprovement = weekSessions.length >= 2
      ? Number(weekSessions[0]?.accuracy || 0) - Number(weekSessions[weekSessions.length - 1]?.accuracy || 0)
      : 0

    // simulated pronunciation heatmap scores based on accuracy distribution
    const soundScores = SOUND_MAP.map((s, index) => {
      const varianceSeed = ((index + 3) * 17 + totalSessions * 9) % 21
      const variance = varianceSeed / 100 - 0.1
      return {
        ...s,
        score: Math.max(0.2, Math.min(1, averageAccuracy + variance)),
      }
    })

    // readiness scores (simulated from accuracy)
    const readiness = {
      restaurant: Math.min(100, Math.round(averageAccuracy * 100 + (totalSessions > 5 ? 12 : 0))),
      directions: Math.min(100, Math.round(averageAccuracy * 100 - 5 + (totalSessions > 3 ? 8 : 0))),
      smallTalk: Math.min(100, Math.round(averageAccuracy * 100 - 10 + (totalSessions > 8 ? 15 : 0))),
    }

    const recentWordMap = new Map()
    sessions.slice(0, 10).forEach((session) => {
      ;(session.wordFeedback || []).forEach((item) => {
        if (item.status === 'correct') return
        const key = (item.expectedWord || '').toLowerCase()
        if (!key) return
        const current = recentWordMap.get(key) || {
          word: item.expectedWord,
          close: 0,
          incorrect: 0,
          attempts: 0,
          sourceSession: session,
        }
        current.attempts += 1
        if (item.status === 'close') current.close += 1
        if (item.status === 'incorrect') current.incorrect += 1
        current.sourceSession = current.sourceSession || session
        recentWordMap.set(key, current)
      })
    })

    const trickyWords = [...recentWordMap.values()]
      .sort((left, right) => (right.incorrect * 2 + right.close) - (left.incorrect * 2 + left.close))
      .slice(0, 8)

    return {
      totalSessions, averageAccuracy, recentTrend, trendDelta, strongPasses,
      totalTurns, weekAccuracy, weekImprovement, soundScores, readiness, trickyWords,
    }
  }, [sessions])

  const level = getLevel(metrics.averageAccuracy)
  const avgPct = Math.round(metrics.averageAccuracy * 100)
  const displaySessions = showAllSessions ? sessions : sessions.slice(0, 6)

  function launchWordDrill(item) {
    if (!item?.sourceSession) return
    const session = createQuickFixSession(profile, {
      ...item.sourceSession,
      correctedPhrase: item.word,
      visualGuide: {
        ...item.sourceSession.visualGuide,
        word: item.word,
      },
      focus: item.word,
      comparisonNotes:
        item.sourceSession.comparisonNotes ||
        `Drill ${item.word} until it feels lighter and cleaner.`,
    })
    activeSession.save(session)
    route.navigate(APP_ROUTES.trainer)
  }

  return (
    <AppShell
      auth={auth}
      route={route}
      section="progress"
      header={<AppHeader title="Progress" subtitle="Your speaking journey." />}
    >
      <div className="space-y-4 px-5 pb-4">
        {/* ─── level + accuracy hero ─── */}
        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.04em] ${level.bg} ${level.color}`}>
                  {level.label}
                </span>
                <span className={`text-[0.72rem] font-semibold tabular-nums ${metrics.trendDelta >= 0 ? 'text-mint' : 'text-danger'}`}>
                  {metrics.trendDelta >= 0 ? '+' : ''}{Math.round(metrics.trendDelta * 100)}pts
                </span>
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-[3.2rem] font-bold tabular-nums leading-none text-ink">{avgPct}</span>
                <span className="pb-1.5 text-[1rem] font-medium text-ink/20">%</span>
              </div>
              <p className="mt-1 text-[0.72rem] text-ink/30">average accuracy</p>
            </div>

            {/* level progress ring */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="4" />
                <motion.circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - avgPct / 100) }}
                  transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                  className={level.color}
                />
              </svg>
              <span className="absolute text-[0.72rem] font-bold text-ink/50">{level.label.slice(0, 3)}</span>
            </div>
          </div>

          {/* mini trend chart */}
          <div className="mt-5 flex h-14 items-end gap-1.5">
            {(metrics.recentTrend.length ? metrics.recentTrend : [0.12, 0.18, 0.16, 0.24, 0.21, 0.26, 0.3, 0.38]).map((value, index) => (
              <motion.div
                key={index}
                initial={{ height: 4 }}
                animate={{ height: `${Math.max(4, value * 56)}px` }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex-1 rounded-md bg-accent"
                style={{ opacity: 0.3 + value * 0.7 }}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <RewardTile label="Daily streak" value={`${profile.streakCount || 0}`} note={`best ${profile.longestStreak || 0}`} />
          <RewardTile label="Confidence" value={`${profile.confidenceScore || 48}%`} note="live score" />
          <RewardTile label="XP / level" value={`${profile.xp || 0}`} note={`Lvl ${profile.level || 1}`} />
        </section>

        {/* ─── weekly report ─── */}
        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">Weekly report</p>
          <div className="mt-3 space-y-2.5">
            <ReportLine
              icon={<TrendIcon up={metrics.weekImprovement >= 0} />}
              text={
                metrics.weekImprovement >= 0
                  ? `You improved clarity by ${Math.abs(Math.round(metrics.weekImprovement * 100))}% this week`
                  : `Focus more this week — clarity dipped ${Math.abs(Math.round(metrics.weekImprovement * 100))}%`
              }
              tone={metrics.weekImprovement >= 0 ? 'text-mint' : 'text-amber'}
            />
            <ReportLine
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22a10 10 0 100-20 10 10 0 000 20z" /><path d="M12 6v6l4 2" /></svg>}
              text={`${metrics.totalTurns} total speaking turns completed`}
              tone="text-ink/50"
            />
            <ReportLine
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
              text={`${metrics.strongPasses} strong passes (88%+)`}
              tone="text-ink/50"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">Words to fix</p>
          <p className="mt-1 text-[0.72rem] text-ink/35">Recent words that still need cleaner pronunciation</p>

          {metrics.trickyWords.length ? (
            <div className="mt-4 grid gap-2">
              {metrics.trickyWords.map((item) => (
                <button
                  key={item.word}
                  type="button"
                  onClick={() => launchWordDrill(item)}
                  className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-3 py-3 text-left transition hover:bg-ink/[0.045]"
                >
                  <div>
                    <p className="text-[0.82rem] font-semibold text-ink">{item.word}</p>
                    <p className="mt-0.5 text-[0.68rem] text-ink/38">
                      {item.incorrect ? `${item.incorrect} missed` : `${item.close} close`} · {item.attempts} tries
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/[0.08] px-2.5 py-1 text-[0.66rem] font-semibold text-accent">
                    Drill this now
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-mint/8 px-4 py-3 text-[0.8rem] text-mint">
              No repeat problem words yet. Keep speaking and this section will fill itself in.
            </div>
          )}
        </section>

        {/* ─── pronunciation heatmap ─── */}
        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">Pronunciation heatmap</p>
          <p className="mt-1 text-[0.72rem] text-ink/35">Your weak sounds based on recent sessions</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {metrics.soundScores.map((s) => {
              const pct = Math.round(s.score * 100)
              const color = pct >= 80 ? 'bg-mint/15 text-mint' : pct >= 60 ? 'bg-amber/15 text-amber' : 'bg-danger/15 text-danger'
              return (
                <motion.div
                  key={s.sound}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col items-center rounded-xl p-2.5 ${color}`}
                >
                  <span className="text-[1rem] font-bold tabular-nums">{pct}</span>
                  <span className="mt-0.5 text-[0.6rem] font-semibold opacity-70">{s.sound}</span>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ─── real-world readiness ─── */}
        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">Real-world readiness</p>
          <div className="mt-4 space-y-3">
            <ReadinessBar label="Order at a restaurant" value={metrics.readiness.restaurant} />
            <ReadinessBar label="Ask for directions" value={metrics.readiness.directions} />
            <ReadinessBar label="Make small talk" value={metrics.readiness.smallTalk} />
          </div>
        </section>

        {/* ─── stat tiles ─── */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Turns" value={String(metrics.totalSessions)} />
          <StatTile label="Strong" value={String(metrics.strongPasses)} note="88%+" />
          <StatTile label="Level" value={level.label} />
        </div>

        {error ? (
          <div className="rounded-xl bg-danger/8 px-4 py-3 text-[0.82rem] text-danger">{error}</div>
        ) : null}

        {/* ─── session history ─── */}
        <section>
          <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">Recent sessions</p>
          <div className="space-y-2">
            {displaySessions.length ? (
              <>
                {displaySessions.map((session) => (
                  <SessionCard key={session.id} session={session} relative={formatRelative(session.createdAt)} />
                ))}
                {sessions.length > 6 && !showAllSessions ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSessions(true)}
                    className="w-full rounded-xl bg-ink/[0.03] py-3 text-[0.78rem] font-medium text-ink/40 transition hover:bg-ink/[0.05]"
                  >
                    Show all {sessions.length} sessions
                  </button>
                ) : null}
              </>
            ) : !isPending ? (
              <div className="rounded-2xl bg-ink/[0.02] p-6 text-center">
                <p className="text-[0.82rem] text-ink/35">Your history appears after the first turn.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function StatTile({ label, value, note }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-ink/25">{label}</p>
      <p className="mt-1 text-[1.2rem] font-bold tabular-nums text-ink">{value}</p>
      {note ? <p className="mt-0.5 text-[0.6rem] text-ink/25">{note}</p> : null}
    </div>
  )
}

function RewardTile({ label, value, note }) {
  return (
    <div className="rounded-2xl bg-white p-3.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-ink/25">{label}</p>
      <p className="mt-1 text-[1.1rem] font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-[0.62rem] text-ink/28">{note}</p>
    </div>
  )
}

function ReadinessBar({ label, value }) {
  const color = value >= 80 ? 'bg-mint' : value >= 50 ? 'bg-accent' : 'bg-amber'
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] text-ink/55">{label}</span>
        <span className="text-[0.82rem] font-bold tabular-nums text-ink">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.04]">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </div>
  )
}

function ReportLine({ icon, text, tone }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 shrink-0 ${tone}`}>{icon}</span>
      <p className="text-[0.82rem] leading-snug text-ink/55">{text}</p>
    </div>
  )
}

function TrendIcon({ up }) {
  return up ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}
