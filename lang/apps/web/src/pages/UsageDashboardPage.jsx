import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { APP_ROUTES } from '@/lib/routes'
import { buildApiUrl } from '@/lib/runtime'

const PASSWORD_KEY = 'lang.usage-dashboard.password'

async function requestUsage(idToken, password) {
  const response = await fetch(buildApiUrl('/api/admin-usage'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Usage-Password': password,
    },
  })

  const raw = await response.text()
  let payload = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { error: raw || 'Unable to load usage dashboard.' }
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load usage dashboard.')
  }

  return payload
}

function formatMinutes(value = 0) {
  return `${Number(value || 0).toFixed(1)}m`
}

function formatRelative(dateString = '') {
  if (!dateString) return 'No activity yet'
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function UsageDashboardPage({ auth, route }) {
  const [password, setPassword] = useState(() =>
    typeof window === 'undefined' ? '' : window.sessionStorage.getItem(PASSWORD_KEY) || '',
  )
  const [submittedPassword, setSubmittedPassword] = useState(() =>
    typeof window === 'undefined' ? '' : window.sessionStorage.getItem(PASSWORD_KEY) || '',
  )
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      if (!auth.session || !submittedPassword) return
      setLoading(true)
      setError('')
      try {
        const session = await auth.getValidSession()
        const next = await requestUsage(session.idToken, submittedPassword)
        if (!active) return
        setData(next)
      } catch (requestError) {
        if (!active) return
        setError(requestError.message)
        setData(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [auth, submittedPassword])

  const burnRate = useMemo(() => {
    const totalMinutes = Number(data?.usageStats?.totalMinutesUsed || 0)
    const sessions = Math.max(1, Number(data?.sessionHistoryCount || 0))
    return totalMinutes ? (totalMinutes / sessions).toFixed(2) : '0.00'
  }, [data?.sessionHistoryCount, data?.usageStats?.totalMinutesUsed])

  function handleUnlock(event) {
    event.preventDefault()
    const next = password.trim()
    if (!next) return
    window.sessionStorage.setItem(PASSWORD_KEY, next)
    setSubmittedPassword(next)
  }

  function handleLock() {
    window.sessionStorage.removeItem(PASSWORD_KEY)
    setSubmittedPassword('')
    setPassword('')
    setData(null)
    setError('')
  }

  return (
    <div className="app-stage min-h-screen">
      <div className="phone-shell flex flex-col">
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1.2rem)] pb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-accent/55">Private ops</p>
              <h1 className="mt-1 text-[1.55rem] font-bold tracking-[-0.04em] text-ink">Ling One</h1>
            </div>
            <button
              type="button"
              onClick={() => route.navigate(APP_ROUTES.app)}
              className="rounded-full bg-ink/[0.04] px-3 py-1.5 text-[0.72rem] font-medium text-ink/48"
            >
              Back to app
            </button>
          </div>

          <section
            className="mt-5 rounded-[1.8rem] bg-white/92 p-5"
            style={{ boxShadow: '0 18px 44px -24px rgba(15, 20, 25, 0.16)' }}
          >
            <p className="text-[0.84rem] leading-snug text-ink/45">
              Track remaining speaking time, total voice load, and how fast this account is burning through voice usage.
            </p>

            {!auth.session ? (
              <div className="mt-4 rounded-[1rem] bg-ink/[0.03] px-3.5 py-3">
                <p className="text-[0.78rem] font-semibold text-ink">Sign in required</p>
                <p className="mt-1 text-[0.72rem] leading-snug text-ink/38">
                  Ling One uses your signed-in UseLang account plus the dashboard password. Sign in first, then unlock the board.
                </p>
                <button
                  type="button"
                  onClick={() => route.navigate(APP_ROUTES.login)}
                  className="btn-primary mt-3 !py-2.5 !text-[0.76rem]"
                >
                  Go to sign in
                </button>
              </div>
            ) : !submittedPassword ? (
              <form onSubmit={handleUnlock} className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[0.72rem] font-medium text-ink/35">Dashboard password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1.5 w-full rounded-[1rem] bg-ink/[0.04] px-3.5 py-3 text-[0.82rem] font-medium text-ink"
                    placeholder="Enter the Ling One password"
                  />
                </label>
                <button type="submit" className="btn-primary w-full">
                  Unlock dashboard
                </button>
              </form>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-[1rem] bg-ink/[0.03] px-3.5 py-3">
                <div>
                  <p className="text-[0.74rem] font-semibold text-ink">Signed in as {data?.email || auth.session?.email}</p>
                  <p className="mt-0.5 text-[0.7rem] text-ink/35">Last activity {formatRelative(data?.usageStats?.lastActivityAt)}</p>
                </div>
                <button type="button" onClick={handleLock} className="text-[0.74rem] font-medium text-danger">
                  Lock
                </button>
              </div>
            )}
          </section>

          {error ? (
            <div className="mt-4 rounded-[1rem] bg-danger/8 px-4 py-3 text-[0.8rem] text-danger">{error}</div>
          ) : null}

          {loading ? (
            <div className="mt-4 rounded-[1rem] bg-white/88 px-4 py-4 text-[0.82rem] text-ink/45">Loading usage…</div>
          ) : null}

          {data ? (
            <>
              <section className="mt-4 grid grid-cols-2 gap-2">
                <MetricCard label="Minutes left today" value={formatMinutes(data.minutesRemaining)} note={`of ${formatMinutes(data.dailyLimit)}`} />
                <MetricCard label="Used today" value={formatMinutes(data.minutesUsedToday)} note={data.plan} />
                <MetricCard label="Lifetime minutes" value={formatMinutes(data.usageStats.totalMinutesUsed)} note="estimated STT load" />
                <MetricCard label="Avg per session" value={`${burnRate}m`} note="recent average" />
              </section>

              <section className="mt-4 rounded-[1.55rem] bg-white/88 p-4" style={{ boxShadow: '0 14px 36px -22px rgba(15, 20, 25, 0.14)' }}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-ink/25">Voice calls</p>
                <p className="mt-1 text-[0.74rem] leading-snug text-ink/38">
                  This is UseLang operational usage for this account, not Deepgram or provider billing.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricCard label="TTS calls" value={String(data.usageStats.totalTtsCalls || 0)} note="coach / prompt audio" compact />
                  <MetricCard label="STT calls" value={String(data.usageStats.totalSttCalls || 0)} note="recorded takes" compact />
                  <MetricCard label="Plan builds" value={String(data.usageStats.customPlanBuilds || 0)} note="custom lesson drafts" compact />
                  <MetricCard label="Downloads" value={String(data.usageStats.downloadsSaved || 0)} note="saved offline" compact />
                </div>
              </section>

              <section className="mt-4 rounded-[1.55rem] bg-white/88 p-4" style={{ boxShadow: '0 14px 36px -22px rgba(15, 20, 25, 0.14)' }}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-ink/25">Trainer & conversation</p>
                <p className="mt-1 text-[0.74rem] leading-snug text-ink/38">
                  Counts from the trainer and multi-turn practice flows.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricCard label="Trainer prompts" value={String(data.usageStats.trainerPrompts || 0)} note="coach requests" compact />
                  <MetricCard label="Trainer evaluations" value={String(data.usageStats.trainerEvaluations || 0)} note="graded replies" compact />
                  <MetricCard label="Conversation turns" value={String(data.usageStats.conversationTurns || 0)} note="back-and-forth steps" compact />
                  <MetricCard label="Completed sessions" value={String(data.usageStats.completedSessions || 0)} note="finished scenarios" compact />
                </div>
              </section>

              <section className="mt-4 rounded-[1.55rem] bg-white/88 p-4" style={{ boxShadow: '0 14px 36px -22px rgba(15, 20, 25, 0.14)' }}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-ink/25">Recent activity</p>
                <div className="mt-3 space-y-2">
                  {(data.recentSessions || []).length ? (
                    data.recentSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[1rem] bg-ink/[0.03] px-3.5 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.78rem] font-semibold text-ink">{session.scenarioLabel}</p>
                            <p className="mt-0.5 text-[0.7rem] text-ink/38">{session.correctedPhrase}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[0.8rem] font-semibold text-ink">{Math.round((session.accuracy || 0) * 100)}%</p>
                            <p className="text-[0.66rem] text-ink/28">{formatRelative(session.createdAt)}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] bg-ink/[0.03] px-3.5 py-3 text-[0.78rem] text-ink/42">
                      No recent sessions yet.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, note, compact = false }) {
  return (
    <div className={`rounded-[1rem] bg-ink/[0.03] ${compact ? 'px-3 py-3' : 'px-3.5 py-3.5'}`}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-ink/25">{label}</p>
      <p className={`mt-1 font-bold tabular-nums text-ink ${compact ? 'text-[1rem]' : 'text-[1.2rem]'}`}>{value}</p>
      <p className="mt-0.5 text-[0.64rem] text-ink/30">{note}</p>
    </div>
  )
}
