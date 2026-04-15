import { motion, AnimatePresence } from 'framer-motion'

const STATE_LABEL = {
  idle: 'Tap to speak',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking',
  blocked: 'Limit reached',
}

const BREATHING = {
  idle: { scale: [1, 1.02, 1], duration: 4 },
  listening: { scale: [1, 1.06, 1.02, 1.07, 1], duration: 0.9 },
  thinking: { scale: [1, 1.03, 1.01, 1.03, 1], duration: 1.6 },
  speaking: { scale: [1, 1.04, 1.06, 1.03, 1], duration: 1 },
  blocked: { scale: [1, 1, 1], duration: 6 },
}

function blobMotion(state, activityLevel, offset = 0) {
  const a = Math.min(1, Math.max(0, activityLevel || 0))
  const d = 6 + a * 14 + offset

  if (state === 'listening') {
    return {
      x: [-d, d * 0.6, -d],
      y: [d * 0.3, -d * 0.5, d * 0.3],
      scale: [1, 1.1 + a * 0.1, 1],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
    }
  }
  if (state === 'speaking') {
    return {
      x: [-d * 0.4, d, -d * 0.4],
      y: [-d * 0.5, d * 0.3, -d * 0.5],
      scale: [1, 1.14 + a * 0.08, 1],
      transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
    }
  }
  if (state === 'thinking') {
    return {
      x: [-d * 0.3, d * 0.3, -d * 0.3],
      y: [d * 0.2, -d * 0.2, d * 0.2],
      scale: [1, 1.04, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    }
  }
  return {
    x: [-d * 0.15, d * 0.15, -d * 0.15],
    y: [d * 0.08, -d * 0.08, d * 0.08],
    scale: [1, 1.02, 1],
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
  }
}

export function AISphere({
  state = 'idle',
  onTap,
  disabled,
  size = 200,
  activityLevel = 0,
  label,
  hideLabel = false,
  tone = 'accent',
}) {
  const breath = BREATHING[state] || BREATHING.idle
  const interactive = !disabled && typeof onTap === 'function'
  const isActive = state === 'listening' || state === 'speaking'
  const resolvedLabel = label ?? STATE_LABEL[state]
  const palette =
    tone === 'warm'
      ? {
          halo:     'rgba(201,169,122,0.09)',
          ring:     'rgba(201,169,122,0.15)',
          deep:     'rgba(201,169,122,0.52)',
          deepSoft: 'rgba(201,169,122,0.20)',
          soft:     'rgba(235,218,195,0.42)',
          warm:     'rgba(252,247,242,0.65)',
          surface:  'linear-gradient(145deg,#ffffff 0%,#fdf9f4 52%,#f8f0e4 100%)',
          inset:    'inset 0 -8px 20px rgba(201,169,122,0.06), inset 0 2px 0 rgba(255,255,255,0.92)',
        }
      : tone === 'mint'
      ? {
          halo: 'rgba(48, 209, 136, 0.12)',
          ring: 'rgba(48, 209, 136, 0.18)',
          deep: 'rgba(48, 209, 136, 0.66)',
          deepSoft: 'rgba(48, 209, 136, 0.28)',
          soft: 'rgba(174, 240, 213, 0.42)',
          warm: 'rgba(215, 255, 238, 0.48)',
          surface: 'linear-gradient(145deg, #ffffff 0%, #eefbf6 52%, #dbf7ed 100%)',
          inset: 'inset 0 -8px 20px rgba(48,209,136,0.08), inset 0 2px 0 rgba(255,255,255,0.8)',
        }
      : tone === 'amber'
        ? {
            halo: 'rgba(255, 184, 0, 0.12)',
            ring: 'rgba(255, 184, 0, 0.18)',
            deep: 'rgba(255, 173, 51, 0.72)',
            deepSoft: 'rgba(255, 173, 51, 0.28)',
            soft: 'rgba(255, 222, 155, 0.38)',
            warm: 'rgba(255, 241, 214, 0.55)',
            surface: 'linear-gradient(145deg, #ffffff 0%, #fff8ea 52%, #fff0cc 100%)',
            inset: 'inset 0 -8px 20px rgba(255,184,0,0.08), inset 0 2px 0 rgba(255,255,255,0.8)',
          }
        : {
            halo: 'rgba(0, 122, 255, 0.1)',
            ring: 'rgba(0, 122, 255, 0.2)',
            deep: 'rgba(0, 122, 255, 0.7)',
            deepSoft: 'rgba(0, 122, 255, 0.28)',
            soft: 'rgba(120, 180, 255, 0.5)',
            warm: 'rgba(255, 220, 240, 0.4)',
            surface: 'linear-gradient(145deg, #ffffff 0%, #e8f0fe 50%, #d4e5fc 100%)',
            inset: 'inset 0 -8px 20px rgba(0,122,255,0.06), inset 0 2px 0 rgba(255,255,255,0.8)',
          }

  return (
    <div className="relative flex flex-col items-center" style={{ width: size + 40 }}>
      {/* soft halo */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size + 80,
          height: size + 80,
          background: `radial-gradient(circle, ${palette.halo} 0%, transparent 70%)`,
        }}
        animate={{
          opacity: isActive ? [0.5, 1, 0.5] : [0.3, 0.5, 0.3],
          scale: isActive ? [0.95, 1.08, 0.95] : [1, 1.03, 1],
        }}
        transition={{ duration: isActive ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* pulse ring on active */}
      {isActive ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ width: size + 20, height: size + 20, borderColor: palette.ring }}
          aria-hidden="true"
          animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}

      <motion.button
        type="button"
        onClick={onTap}
        disabled={!interactive}
        whileTap={interactive ? { scale: 0.96 } : undefined}
        animate={{ scale: breath.scale }}
        transition={{ duration: breath.duration, repeat: Infinity, ease: 'easeInOut' }}
        className="sphere-shadow relative overflow-hidden rounded-full disabled:cursor-default"
        style={{
          width: size,
          height: size,
          background: palette.surface,
          border: '0.5px solid rgba(255,255,255,0.9)',
        }}
      >
        {/* highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.95) 0%, transparent 40%)',
          }}
        />

        {/* primary blob */}
        <motion.div
          className="absolute -inset-[8%] rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 85%, ${palette.deep} 0%, ${palette.deepSoft} 30%, transparent 65%)`,
            filter: 'blur(12px)',
          }}
          animate={blobMotion(state, activityLevel, 0)}
        />

        {/* secondary blob */}
        <motion.div
          className="absolute -inset-[12%] rounded-full"
          style={{
            background: `radial-gradient(circle at 45% 30%, ${palette.soft} 0%, rgba(255,255,255,0.18) 35%, transparent 60%)`,
            filter: 'blur(18px)',
            mixBlendMode: 'screen',
          }}
          animate={blobMotion(state, activityLevel, 4)}
        />

        {/* warm accent */}
        <motion.div
          className="absolute inset-[10%] rounded-full"
          style={{
            background: `radial-gradient(circle at 65% 30%, ${palette.warm} 0%, transparent 40%)`,
            filter: 'blur(12px)',
          }}
          animate={{
            x: [-6, 8, -6],
            y: [4, -6, 4],
            scale: state === 'speaking' ? [1, 1.1, 1] : [1, 1.03, 1],
          }}
          transition={{ duration: state === 'speaking' ? 1 : 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* inner glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: palette.inset,
          }}
        />
      </motion.button>

      {!hideLabel ? (
        <div className="mt-4 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${state}-${resolvedLabel}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="text-[0.82rem] font-medium text-ink/50"
            >
              {resolvedLabel}
            </motion.p>
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  )
}
