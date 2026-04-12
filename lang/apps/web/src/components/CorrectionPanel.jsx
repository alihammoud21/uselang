import { motion } from 'framer-motion'

function HighlightedPhrase({ words = [], onWordTap }) {
  if (!words.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {words.map((word, index) => {
        const status = word.status || 'correct'
        const tone =
          status === 'correct'
            ? 'bg-ink/[0.04] text-ink'
            : status === 'close'
              ? 'bg-amber/10 text-amber'
              : 'bg-accent/10 text-accent'

        return (
          <motion.button
            type="button"
            key={`${word.expectedWord}-${index}`}
            onClick={() => onWordTap?.(word)}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            className={`rounded-lg px-2.5 py-1.5 text-[0.8rem] font-medium transition active:scale-[0.97] ${tone}`}
          >
            {word.expectedWord}
          </motion.button>
        )
      })}
    </div>
  )
}

export function CorrectionPanel({
  turn,
  onReplayCoach,
  onPlaySlow,
  onWordTap,
  onOpenGuide,
}) {
  if (!turn) return null

  const accuracy = typeof turn.accuracy === 'number' ? Math.round(turn.accuracy * 100) : null
  const guide = turn.visualGuide || {}
  const accuracyColor =
    accuracy === null
      ? 'text-ink'
      : accuracy >= 88
        ? 'text-mint'
        : accuracy >= 70
          ? 'text-amber'
          : 'text-accent'

  return (
    <motion.section
      layout
      key={turn.transcript || turn.correctedPhrase}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-white p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* header with accuracy */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-ink/35">{turn.modeTitle || 'Coach'}</p>
          <p className="mt-1.5 text-[0.92rem] font-medium leading-snug text-ink">
            {turn.explanation || 'Correction will appear here.'}
          </p>
        </div>

        {accuracy !== null ? (
          <div className="text-right">
            <div className={`text-[2rem] font-bold tabular-nums leading-none ${accuracyColor}`}>
              {accuracy}<span className="text-base font-normal text-ink/20">%</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* comparison */}
      <div className="mt-4 space-y-3 rounded-xl bg-ink/[0.025] p-3.5">
        {turn.transcript ? (
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/30">You said</p>
            <p className="mt-1 text-[0.88rem] text-ink/60">"{turn.transcript}"</p>
          </div>
        ) : null}

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/30">Correct</p>
          <div className="mt-1.5">
            {turn.wordFeedback?.length ? (
              <HighlightedPhrase words={turn.wordFeedback} onWordTap={onWordTap} />
            ) : (
              <p className="text-[0.9rem] font-medium text-ink">{turn.correctedPhrase}</p>
            )}
          </div>
        </div>

        {turn.comparisonNotes ? (
          <p className="text-[0.78rem] text-ink/45">{turn.comparisonNotes}</p>
        ) : null}
      </div>

      {/* focus word badge */}
      {guide.word ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-lg bg-accent/[0.06] px-2.5 py-1 text-[0.7rem] font-medium text-accent">
            Focus: {guide.word}
          </span>
          {guide.slowWord ? (
            <span className="text-[0.7rem] text-ink/35">Slow: {guide.slowWord}</span>
          ) : null}
        </div>
      ) : null}

      {/* actions */}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onReplayCoach} className="btn-primary flex-1">Hear coach</button>
        <button type="button" onClick={onPlaySlow} className="btn-ghost flex-1">Slow</button>
        {guide.word ? (
          <button type="button" onClick={onOpenGuide} className="btn-ghost flex-1">Fix it</button>
        ) : null}
      </div>

      {/* next prompt */}
      {turn.promptText ? (
        <div className="mt-4 rounded-xl bg-ink/[0.025] px-3.5 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/30">Next</p>
          <p className="mt-1 text-[0.88rem] font-medium text-ink">{turn.promptText}</p>
          {turn.milestone ? (
            <p className="mt-1.5 text-[0.75rem] text-mint">{turn.milestone}</p>
          ) : null}
        </div>
      ) : null}
    </motion.section>
  )
}
