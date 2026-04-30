import { motion } from 'framer-motion'
import { MIC_STATE_COPY } from '@/lib/mic-states'

const STATE_SURFACE = {
  idle: {
    glow: 'rgba(201,169,122,0.22)',
    shell: 'rgba(201,169,122,0.16)',
    ring: 'rgba(201,169,122,0.28)',
    icon: '#1a1714',
  },
  listening: {
    glow: 'rgba(201,169,122,0.34)',
    shell: 'rgba(201,169,122,0.24)',
    ring: 'rgba(201,169,122,0.45)',
    icon: '#1a1714',
  },
  processing: {
    glow: 'rgba(15,20,25,0.14)',
    shell: 'rgba(15,20,25,0.1)',
    ring: 'rgba(15,20,25,0.22)',
    icon: '#1a1714',
  },
  'result-ready': {
    glow: 'rgba(48,209,88,0.18)',
    shell: 'rgba(48,209,88,0.14)',
    ring: 'rgba(48,209,88,0.3)',
    icon: '#1a1714',
  },
  blocked: {
    glow: 'rgba(15,20,25,0.08)',
    shell: 'rgba(15,20,25,0.06)',
    ring: 'rgba(15,20,25,0.12)',
    icon: 'rgba(15,20,25,0.36)',
  },
}

export function PersistentMicButton({
  state = 'idle',
  onClick,
  disabled = false,
  size = 58,
  className = '',
}) {
  const resolvedState = STATE_SURFACE[state] ? state : 'idle'
  const surface = STATE_SURFACE[resolvedState]
  const interactive = typeof onClick === 'function' && !disabled
  const isListening = resolvedState === 'listening'
  const isProcessing = resolvedState === 'processing'

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-label={MIC_STATE_COPY[resolvedState]}
      className={`group relative inline-flex items-center justify-center rounded-full transition active:scale-[0.97] disabled:opacity-45 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: surface.glow }}
        animate={
          isListening
            ? { scale: [1, 1.26], opacity: [0.58, 0] }
            : { scale: [1, 1.08, 1], opacity: [0.4, 0.72, 0.4] }
        }
        transition={{ duration: isListening ? 1.1 : 2.2, repeat: Infinity, ease: 'easeOut' }}
      />

      <motion.span
        className="relative z-[1] flex items-center justify-center rounded-full border"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderColor: surface.ring,
          background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, ${surface.shell} 100%)`,
          color: surface.icon,
          boxShadow: '0 12px 28px -20px rgba(26,23,20,0.4)',
        }}
        animate={
          isListening
            ? { y: [0, -1.5, 0], scale: [1, 1.04, 1] }
            : { y: [0, -0.8, 0], scale: [1, 1.02, 1] }
        }
        transition={{ duration: isListening ? 0.64 : 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MicGlyph size={Math.max(16, Math.round(size * 0.32))} />
      </motion.span>

      {isProcessing ? (
        <motion.span
          className="pointer-events-none absolute z-[2] rounded-full border-2 border-t-transparent"
          style={{
            width: size * 0.9,
            height: size * 0.9,
            borderColor: 'rgba(15,20,25,0.28)',
            borderTopColor: 'transparent',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.92, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}

      {resolvedState === 'result-ready' ? (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 z-[3] flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white bg-[#30d158] text-white shadow-[0_8px_18px_-10px_rgba(48,209,88,0.72)]">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l4 4 10-10" />
          </svg>
        </span>
      ) : null}
    </button>
  )
}

function MicGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  )
}
