import { motion } from 'framer-motion'

const MODES = {
  neutral: {
    tongue: 'M48 77 C64 72 82 69 99 70 C113 71 125 73 135 76',
    marker: { x: 96, y: 69 },
    airflow: 'M48 34 C67 28 86 26 106 28',
    airflowLabel: 'steady air',
    lips: 'M118 58 C126 57 133 58 138 61',
  },
  front: {
    tongue: 'M48 77 C65 70 83 62 102 58 C116 56 127 58 135 63',
    marker: { x: 103, y: 58 },
    airflow: 'M48 34 C67 27 90 24 112 26',
    airflowLabel: 'front vowel',
    lips: 'M118 58 C126 57 133 58 138 60',
  },
  rounded: {
    tongue: 'M48 77 C65 73 84 70 103 70 C117 70 127 72 135 75',
    marker: { x: 100, y: 70 },
    airflow: 'M48 34 C68 30 90 29 112 31',
    airflowLabel: 'round lips',
    lips: 'M120 57 C128 54 135 55 139 60',
  },
  uvular: {
    tongue: 'M48 77 C63 72 78 67 92 60 C101 56 106 49 109 42',
    marker: { x: 109, y: 42 },
    airflow: 'M110 36 C120 31 129 29 137 31',
    airflowLabel: 'back throat',
    lips: 'M118 58 C126 57 133 58 138 61',
  },
  nasal: {
    tongue: 'M48 77 C64 72 82 69 99 70 C113 71 125 73 135 76',
    marker: { x: 95, y: 69 },
    airflow: 'M48 34 C67 28 86 26 106 28',
    airflowLabel: 'nose + mouth',
    nasalAir: 'M97 36 C100 24 108 15 118 14',
    lips: 'M118 58 C126 57 133 58 138 61',
  },
  alveolar: {
    tongue: 'M48 77 C65 72 84 67 100 61 C110 57 118 53 123 49',
    marker: { x: 122, y: 49 },
    airflow: 'M48 34 C66 28 84 25 102 27',
    airflowLabel: 'tap ridge',
    lips: 'M118 58 C126 57 133 58 138 61',
  },
  mandarin: {
    tongue: 'M48 77 C65 72 82 68 99 67 C114 66 126 68 135 72',
    marker: { x: 96, y: 67 },
    airflow: 'M48 34 C67 29 88 27 109 28',
    airflowLabel: 'clean tone',
    lips: 'M118 58 C126 57 133 58 138 60',
  },
}

function resolveMode(guide = {}) {
  if (guide?.diagramMode && MODES[guide.diagramMode]) return guide.diagramMode

  const text = `${guide?.tonguePosition || ''} ${guide?.lipShape || ''} ${guide?.airflow || ''}`.toLowerCase()
  if (text.includes('nasal')) return 'nasal'
  if (text.includes('round')) return 'rounded'
  if (text.includes('ridge') || text.includes('tap')) return 'alveolar'
  if (text.includes('back') || text.includes('throat') || text.includes('french r')) return 'uvular'
  if (text.includes('tone') || text.includes('precise')) return 'mandarin'
  if (text.includes('front') || text.includes('forward')) return 'front'
  return 'neutral'
}

export function PronunciationDiagram({ guide, size = 132, compact = false }) {
  const mode = resolveMode(guide)
  const config = MODES[mode]

  return (
    <div className="relative">
      <svg
        viewBox="0 0 160 122"
        width={size}
        height={(size / 160) * 122}
        className={compact ? 'drop-shadow-[0_14px_26px_rgba(0,122,255,0.08)]' : 'drop-shadow-[0_22px_36px_rgba(0,122,255,0.1)]'}
      >
        <defs>
          <linearGradient id="speech-surface" x1="20" y1="14" x2="140" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#edf4ff" />
          </linearGradient>
          <linearGradient id="tongue-surface" x1="48" y1="58" x2="134" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(118,168,255,0.95)" />
            <stop offset="100%" stopColor="rgba(60,122,245,0.9)" />
          </linearGradient>
        </defs>

        <path
          d="M18 63 C20 38 38 18 68 15 H103 C124 16 139 28 142 43 C145 58 143 71 138 82 C131 96 118 105 102 108 H70 C41 104 22 87 18 63 Z"
          fill="url(#speech-surface)"
          stroke="#d7e2f1"
          strokeWidth="1.2"
        />

        <path d="M44 31 C71 25 95 24 116 29" fill="none" stroke="#c1cee0" strokeWidth="3.4" strokeLinecap="round" />
        <path d={config.lips} fill="none" stroke="rgba(255,134,145,0.9)" strokeWidth="4.1" strokeLinecap="round" />
        <path d="M117 67 C126 69 133 69 139 66" fill="none" stroke="rgba(255,134,145,0.66)" strokeWidth="3" strokeLinecap="round" />

        <motion.path
          d={config.tongue}
          fill="none"
          stroke="url(#tongue-surface)"
          strokeWidth="6.2"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 0.32 }}
        />
        <motion.circle
          cx={config.marker.x}
          cy={config.marker.y}
          r="8.5"
          fill="rgba(90,146,255,0.12)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 220, damping: 18 }}
        />
        <motion.circle
          cx={config.marker.x}
          cy={config.marker.y}
          r="5.6"
          fill="rgba(90,146,255,0.16)"
          stroke="rgba(84,142,255,0.84)"
          strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 220, damping: 18 }}
        />

        <motion.path
          d={config.airflow}
          fill="none"
          stroke="rgba(85,203,117,0.88)"
          strokeWidth="1.8"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 0.32, delay: 0.08 }}
        />
        <polygon points="43,34 49,31 48,37" fill="rgba(85,203,117,0.88)" />

        {config.nasalAir ? (
          <motion.path
            d={config.nasalAir}
            fill="none"
            stroke="rgba(85,203,117,0.62)"
            strokeWidth="1.6"
            strokeDasharray="3 2"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: 0.32, delay: 0.14 }}
          />
        ) : null}
      </svg>

      <div className={`mt-2 flex items-center ${compact ? 'justify-start gap-2.5' : 'justify-center gap-3.5'}`}>
        <LegendDot color="bg-accent/60" label="Tongue" />
        <LegendDot color="bg-danger/60" label="Lips" />
        <LegendDot color="bg-mint/60" label={config.airflowLabel} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-[0.54rem] text-ink/34">{label}</span>
    </span>
  )
}
