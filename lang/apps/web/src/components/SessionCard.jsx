export function SessionCard({ session, relative }) {
  const accuracy = Math.round((session.accuracy || 0) * 100)
  const color = accuracy >= 88 ? 'text-mint' : accuracy >= 70 ? 'text-amber' : 'text-accent'

  return (
    <article className="rounded-xl bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/25">
            {session.modeTitle || session.scenarioLabel || 'Turn'}
          </p>
          <p className="mt-1 text-[0.88rem] font-semibold leading-snug text-ink">
            {session.correctedPhrase}
          </p>
        </div>
        <span className={`text-[0.85rem] font-bold tabular-nums ${color}`}>{accuracy}%</span>
      </div>

      {session.transcript ? (
        <p className="mt-2 rounded-lg bg-ink/[0.025] px-3 py-2 text-[0.78rem] text-ink/45">
          You said "{session.transcript}"
        </p>
      ) : null}

      {session.explanation ? (
        <p className="mt-2 text-[0.78rem] text-ink/40">{session.explanation}</p>
      ) : null}

      {session.wordFeedback?.some((item) => item.status !== 'correct') ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.wordFeedback
            .filter((item) => item.status !== 'correct')
            .slice(0, 4)
            .map((item, index) => (
              <span
                key={`${item.expectedWord}-${index}`}
                className={`rounded-md px-2 py-0.5 text-[0.62rem] font-medium ${
                  item.status === 'close' ? 'bg-amber/[0.12] text-amber' : 'bg-danger/8 text-danger'
                }`}
              >
                {item.expectedWord}
              </span>
            ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1.5">
          {session.visualGuide?.word ? (
            <span className="rounded-md bg-ink/[0.04] px-2 py-0.5 text-[0.62rem] font-medium text-ink/40">
              {session.visualGuide.word}
            </span>
          ) : null}
        </div>
        <span className="text-[0.65rem] text-ink/25">{relative}</span>
      </div>
    </article>
  )
}
