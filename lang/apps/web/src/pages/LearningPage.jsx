import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { AppShell } from '@/components/AppShell'
import { blobToBase64 } from '@/lib/audio'
import { speakOffline, stopOfflineSpeech } from '@/lib/speech-synthesis'
import { postTutorSession } from '@/lib/tutor-client'

const COLORS = {
  paper: '#F3EDE3',
  paper2: '#EFE8DC',
  ink: '#111010',
  ink2: '#2B2623',
  muted: '#6B625A',
  muted2: '#8C827A',
  hair: 'rgba(17,16,16,0.08)',
  card: '#FBF7F0',
  amber: '#A85D2E',
  amberDeep: '#7A3F18',
  amberSoft: '#C8894F',
  moss: '#495A3A',
}

const QUICK_ACTIONS = [
  { id: 'lookup', label: 'Quick lookup', icon: 'sparkle' },
  { id: 'camera', label: 'Camera translate', icon: 'camera' },
  { id: 'saved', label: 'Saved phrases', icon: 'bookmark' },
  { id: 'shadowing', label: 'Shadowing', icon: 'headphones' },
]

const RECENT_PHRASES = [
  {
    es: 'Me pones un cafe con leche?',
    phonetic: 'meh POH-nes oon kah-FEH kon LEH-cheh',
    en: 'Can I get a coffee with milk?',
  },
  {
    es: 'La cuenta, por favor.',
    phonetic: 'lah KWEN-tah por fah-VOR',
    en: 'The check, please.',
  },
  {
    es: 'Voy en metro.',
    phonetic: 'boy en MEH-troh',
    en: 'I am going by metro.',
  },
]

const COUNTRY_TAGS = ['ES', 'MX', 'AR', 'CO', 'PE', 'CL', 'VE', 'GT', 'EC', 'CU', 'BO', 'DO']

function getFirstName(profile, auth) {
  const raw = profile?.displayName || profile?.name || auth.session?.email || ''
  if (!raw) return 'Ali'
  if (raw.includes('@')) return raw.split('@')[0].split(/[._-]/)[0] || 'Ali'
  return raw.trim().split(/\s+/)[0] || 'Ali'
}

function formatDuration(seconds = 0) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = Math.round(safe % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function languageCopy(language) {
  if (language.code === 'es') {
    return {
      moduleLabel: 'Conversation · Cafe',
      titleStart: 'Ordering',
      titleAccent: 'el desayuno',
      titleEnd: 'en Madrid.',
      spoken: 'Quisiera un cafe con leche y una tostada, por favor.',
      reach: 'Spanish unlocks',
      countries: '21 countries',
      speakers: '560M',
      accents: '5 accents · 17 dialects · 2nd most spoken',
    }
  }

  return {
    moduleLabel: 'Conversation · Travel',
    titleStart: 'Getting comfortable with',
    titleAccent: language.label,
    titleEnd: 'in real life.',
    spoken: `Let's keep practicing ${language.label} naturally.`,
    reach: `${language.label} unlocks`,
    countries: 'new places',
    speakers: 'real people',
    accents: 'Accents · dialects · local phrasing',
  }
}

function Icon({ name, size = 22, stroke = 1.6 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a1.9 1.9 0 11-2.7 2.7l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a1.9 1.9 0 11-3.8 0v-.2a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a1.9 1.9 0 11-2.7-2.7l.1-.1A1.6 1.6 0 005 15a1.6 1.6 0 00-1.5-1H3.3a1.9 1.9 0 110-3.8h.2A1.6 1.6 0 005 9.2a1.6 1.6 0 00-.3-1.8l-.1-.1a1.9 1.9 0 112.7-2.7l.1.1a1.6 1.6 0 001.8.3 1.6 1.6 0 001-1.5v-.2a1.9 1.9 0 113.8 0v.2a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a1.9 1.9 0 112.7 2.7l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5 1h.2a1.9 1.9 0 110 3.8h-.2A1.6 1.6 0 0019.4 15z" /></svg>
  if (name === 'flame') return <svg {...common}><path d="M12 22c3.8-1 6-3.6 6-7.2 0-2.9-1.7-5.1-3.5-6.9.1 2.2-.7 3.5-2 4.2.2-3.2-1.3-6.2-4.1-8.1.4 3.8-2.4 5.7-2.4 9.8 0 3.6 2.3 6.7 6 8.2z" /></svg>
  if (name === 'bolt') return <svg {...common}><path d="M13 2L4 14h7l-1 8 10-13h-7l1-7z" /></svg>
  if (name === 'trophy') return <svg {...common}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4a2 2 0 002 4h1" /><path d="M17 6h3a2 2 0 01-2 4h-1" /></svg>
  if (name === 'play') return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" /></svg>
  if (name === 'pause') return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" /></svg>
  if (name === 'sparkle') return <svg {...common}><path d="M12 3l1.6 5.1L19 10l-5.4 1.9L12 17l-1.6-5.1L5 10l5.4-1.9L12 3z" /><path d="M19 15l.7 2.2L22 18l-2.3.8L19 21l-.7-2.2L16 18l2.3-.8L19 15z" /></svg>
  if (name === 'camera') return <svg {...common}><path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></svg>
  if (name === 'bookmark') return <svg {...common}><path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-6-3-6 3V4z" /></svg>
  if (name === 'headphones') return <svg {...common}><path d="M4 14v-2a8 8 0 1116 0v2" /><path d="M4 14h3v6H5a1 1 0 01-1-1v-5z" /><path d="M20 14h-3v6h2a1 1 0 001-1v-5z" /></svg>
  if (name === 'mic') return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
  return null
}

function Serif({ children, italic = false, className = '', style = {} }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: '"Fraunces", "Instrument Serif", serif',
        fontVariationSettings: '"opsz" 72',
        fontStyle: italic ? 'italic' : 'normal',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function StatCard({ icon, label, value, active = false }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-0 rounded-[18px] px-3 py-3"
      style={{
        background: active ? COLORS.ink : COLORS.card,
        color: active ? COLORS.paper : COLORS.ink,
        border: `0.5px solid ${active ? 'rgba(255,255,255,0.12)' : COLORS.hair}`,
        boxShadow: '0 1px 2px rgba(17,16,16,0.04), 0 6px 16px rgba(17,16,16,0.04), inset 0 1px 0 rgba(255,255,255,0.75)',
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: active ? COLORS.amberSoft : COLORS.amberDeep }}>
        <Icon name={icon} size={15} stroke={1.55} />
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="mt-1.5 leading-none">
        <Serif className="text-[26px]" style={{ fontWeight: 380 }}>{value}</Serif>
      </p>
    </motion.div>
  )
}

function ContinueHero({ lesson, isPlaying, onPlay, onViewPlan }) {
  const progress = lesson.elapsedSec / lesson.durationSec

  return (
    <section className="px-[22px]">
      <motion.div
        whileTap={{ scale: 0.992 }}
        className="relative overflow-hidden rounded-[24px] px-5 py-5"
        style={{
          background: 'linear-gradient(165deg, #2A1E14 0%, #3B2A1C 45%, #5B3A1E 100%)',
          boxShadow: '0 20px 40px rgba(42,30,20,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
          color: COLORS.paper,
        }}
      >
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,166,93,0.38), transparent 68%)' }} />
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 0.6px, transparent 0.6px)', backgroundSize: '5px 5px', mixBlendMode: 'overlay' }} />

        <div className="relative">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.amberSoft }}>
            {lesson.moduleLabel}
          </p>
          <h2 className="mt-4 max-w-[17rem] text-[26px] leading-[1.02]">
            <Serif style={{ fontWeight: 390 }}>{lesson.titleStart} </Serif>
            <Serif italic style={{ color: COLORS.amberSoft, fontWeight: 340 }}>{lesson.titleAccent}</Serif>
            <Serif style={{ fontWeight: 390 }}> {lesson.titleEnd}</Serif>
          </h2>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.34), rgba(255,255,255,0.12))',
                border: '0.5px solid rgba(255,255,255,0.38)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)',
              }}
              aria-label={isPlaying ? 'Pause lesson' : 'Play lesson'}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-[12px] font-medium" style={{ color: 'rgba(243,237,227,0.72)' }}>
                <span>{lesson.totalPhrases} phrases · {Math.round(lesson.durationSec / 60)} min</span>
                <span>{formatDuration(lesson.elapsedSec)} / {formatDuration(lesson.durationSec)}</span>
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/12">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: 'linear-gradient(90deg, #E8A65D, #F3C98A)' }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewPlan}
            className="mt-5 flex h-10 w-full items-center justify-center rounded-full text-[13px] font-semibold"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: COLORS.paper,
              border: '0.5px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            View plan
          </button>
        </div>
      </motion.div>
    </section>
  )
}

function QuickActions({ onAction }) {
  return (
    <section className="grid grid-cols-4 gap-2 px-[14px]">
      {QUICK_ACTIONS.map((action) => (
        <button key={action.id} type="button" onClick={() => onAction(action.id)} className="group flex min-w-0 flex-col items-center gap-2">
          <motion.span
            whileTap={{ scale: 0.94 }}
            className="flex h-12 w-12 items-center justify-center rounded-[14px]"
            style={{
              background: COLORS.card,
              color: COLORS.amberDeep,
              border: `0.5px solid ${COLORS.hair}`,
              boxShadow: '0 1px 2px rgba(17,16,16,0.04), 0 6px 16px rgba(17,16,16,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <Icon name={action.icon} size={21} stroke={1.45} />
          </motion.span>
          <span className="text-center text-[10.5px] font-medium leading-tight" style={{ color: COLORS.muted }}>
            {action.label}
          </span>
        </button>
      ))}
    </section>
  )
}

function DailyChallenge({ challenge, onAttempt }) {
  return (
    <section className="px-[22px]">
      <div
        className="rounded-[22px] p-4"
        style={{
          background: COLORS.card,
          border: `0.5px solid ${COLORS.hair}`,
          boxShadow: '0 1px 2px rgba(17,16,16,0.04), 0 6px 16px rgba(17,16,16,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: COLORS.amber }}>Daily challenge</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: index < challenge.streakDots ? COLORS.amber : 'rgba(17,16,16,0.12)' }}
              />
            ))}
          </div>
        </div>
        <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: COLORS.muted2 }}>
          Trabalenguas · Tongue twister
        </p>
        <p className="mt-2 text-[21px] leading-[1.14]" style={{ color: COLORS.ink }}>
          <Serif style={{ fontWeight: 390 }}>{challenge.textEs}</Serif>
        </p>
        <p className="mt-4 font-mono text-[11px] leading-relaxed" style={{ color: COLORS.amberDeep }}>
          {challenge.phonetic.map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 ? <span style={{ color: 'rgba(107,98,90,0.38)' }}> · </span> : null}
              {part}
            </span>
          ))}
        </p>
        <div className="my-4 h-px" style={{ background: COLORS.hair }} />
        <p className="text-[14px] italic leading-snug" style={{ color: COLORS.muted }}>
          {challenge.textEn}
        </p>
        <button
          type="button"
          onClick={onAttempt}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold"
          style={{
            background: COLORS.ink,
            color: COLORS.paper,
            boxShadow: '0 6px 16px rgba(17,16,16,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <Icon name="mic" size={17} stroke={1.8} />
          <span>Tap to attempt</span>
          <Icon name="arrow" size={16} stroke={1.8} />
        </button>
      </div>
    </section>
  )
}

function LanguageReach({ copy }) {
  return (
    <section className="px-[22px]">
      <div
        className="rounded-[22px] p-4"
        style={{
          background: COLORS.card,
          border: `0.5px solid ${COLORS.hair}`,
          boxShadow: '0 1px 2px rgba(17,16,16,0.04), 0 6px 16px rgba(17,16,16,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: COLORS.moss }}>Your reach</p>
        <h2 className="mt-3 text-[22px] leading-[1.12]" style={{ color: COLORS.ink }}>
          <Serif style={{ fontWeight: 390 }}>{copy.reach} </Serif>
          <Serif italic style={{ fontWeight: 340 }}>{copy.countries}</Serif>
          <Serif style={{ fontWeight: 390 }}> and </Serif>
          <span className="font-semibold">{copy.speakers}</span>
          <Serif style={{ fontWeight: 390 }}> speakers.</Serif>
        </h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {COUNTRY_TAGS.map((tag, index) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold"
              style={{
                background: index === 0 ? COLORS.amber : 'transparent',
                color: index === 0 ? COLORS.paper : COLORS.muted,
                border: `0.5px solid ${index === 0 ? COLORS.amber : COLORS.hair}`,
              }}
            >
              {tag}
            </span>
          ))}
          <span className="px-1.5 py-1 text-[10.5px] font-medium" style={{ color: COLORS.muted2 }}>+ 9 more</span>
        </div>
        <div className="mt-4 h-px" style={{ background: COLORS.hair }} />
        <p className="mt-3 text-[13px]" style={{ color: COLORS.muted }}>
          <Serif style={{ fontWeight: 390 }}>{copy.accents}</Serif>
        </p>
      </div>
    </section>
  )
}

function RecentPhrases({ phrases, onSelect }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-[22px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: COLORS.amber }}>Recent phrases</p>
        <button type="button" className="text-[12px] font-semibold" style={{ color: COLORS.amber }}>
          See all {">"}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto px-[22px] pb-1 [scroll-snap-type:x_mandatory]">
        {phrases.map((phrase) => (
          <button
            key={phrase.es}
            type="button"
            onClick={() => onSelect(phrase)}
            className="shrink-0 scroll-ml-[22px] rounded-[18px] p-3 text-left [scroll-snap-align:start]"
            style={{
              width: 178,
              background: COLORS.card,
              border: `0.5px solid ${COLORS.hair}`,
              boxShadow: '0 1px 2px rgba(17,16,16,0.04), 0 6px 16px rgba(17,16,16,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <p className="text-[17px] leading-tight" style={{ color: COLORS.ink }}>
              <Serif style={{ fontWeight: 390 }}>{phrase.es}</Serif>
            </p>
            <p className="mt-2 font-mono text-[10.5px] leading-snug" style={{ color: COLORS.amberDeep }}>{phrase.phonetic}</p>
            <div className="my-3 h-px" style={{ background: COLORS.hair }} />
            <p className="text-[12px] italic leading-snug" style={{ color: COLORS.muted }}>{phrase.en}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

function FooterQuote() {
  return (
    <footer className="px-7 pb-[110px] pt-2 text-center">
      <div className="mb-4 h-px" style={{ background: COLORS.hair }} />
      <p className="text-[15px] italic" style={{ color: COLORS.muted }}>
        <Serif italic style={{ fontWeight: 340 }}>El que habla dos lenguas vale por dos.</Serif>
      </p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: COLORS.muted2 }}>
        - Proverbio espanol
      </p>
    </footer>
  )
}

function BottomSheet({ title, children, onClose }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end bg-black/20 px-3 pb-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 330, damping: 32 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded-[28px] p-5"
        style={{
          background: COLORS.card,
          border: '0.5px solid rgba(255,255,255,0.7)',
          boxShadow: '0 24px 60px rgba(17,16,16,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-[21px] leading-tight" style={{ color: COLORS.ink }}>
            <Serif style={{ fontWeight: 390 }}>{title}</Serif>
          </h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-ink/45">x</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

export function LearningPage({ auth, route }) {
  const profile = auth.profile ?? {
    email: auth.session?.email || '',
    languageLearning: 'es',
    nativeLanguage: 'en',
    confidenceScore: 78,
    streakCount: 12,
    level: 1,
  }

  const languageCode = profile.languageLearning || 'es'
  const language = SUPPORTED_LANGUAGES.find((entry) => entry.code === languageCode) || SUPPORTED_LANGUAGES.find((entry) => entry.code === 'es') || SUPPORTED_LANGUAGES[0]
  const copy = languageCopy(language)
  const userName = getFirstName(profile, auth)
  const recognitionRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [challengeState, setChallengeState] = useState({ listening: false, transcript: '', score: null })
  const [lookupState, setLookupState] = useState({ loading: false, query: '', result: null, error: '' })
  const [cameraState, setCameraState] = useState({ loading: false, result: null, error: '' })

  const currentLesson = useMemo(() => ({
    id: 'lesson-14',
    titleStart: copy.titleStart,
    titleAccent: copy.titleAccent,
    titleEnd: copy.titleEnd,
    moduleLabel: copy.moduleLabel,
    totalPhrases: 12,
    durationSec: 243,
    elapsedSec: 102,
    spoken: copy.spoken,
    plan: [
      { label: 'Listen', detail: 'Hear the Madrid cafe line at natural speed.' },
      { label: 'Breakdown', detail: 'Learn desayuno, cafe con leche, and polite ordering rhythm.' },
      { label: 'Repeat', detail: 'Say the phrase back until the stress feels natural.' },
      { label: 'Use it', detail: 'Practice a short breakfast order with the tutor.' },
    ],
  }), [copy])

  const dailyChallenge = useMemo(() => ({
    kind: 'trabalenguas',
    textEs: 'Tres tristes tigres tragaban trigo en un trigal.',
    phonetic: ['tres', 'TREES-tes', 'TEE-gres', 'tra-GA-ban', 'TREE-go', 'en un tri-GAL'],
    textEn: 'Three sad tigers ate wheat in a wheat field.',
    streakDots: 3,
  }), [])

  useEffect(() => {
    return () => {
      stopOfflineSpeech()
      recognitionRef.current?.stop?.()
    }
  }, [])

  function toggleLessonPlayback() {
    if (isPlaying) {
      stopOfflineSpeech()
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    speakOffline(currentLesson.spoken, language.code, 0.86, {
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    })
  }

  async function runLookup(query) {
    const clean = query.trim()
    if (!clean) return
    setLookupState({ loading: true, query: clean, result: null, error: '' })
    try {
      const session = await auth.getValidSession?.().catch(() => auth.session)
      const result = await postTutorSession({
        mode: 'quick-ask',
        text: clean,
        languageCode: language.code,
        nativeLanguageCode: profile.nativeLanguage || 'en',
        tutorStyle: profile.tutorStyle || 'encouraging',
        includeAudio: false,
      }, session?.idToken || auth.session?.idToken || '')
      setLookupState({ loading: false, query: clean, result, error: '' })
    } catch (error) {
      setLookupState({ loading: false, query: clean, result: null, error: error.message || 'Tutor unavailable.' })
    }
  }

  async function runCameraOcr(file) {
    if (!file) return
    setCameraState({ loading: true, result: null, error: '' })
    try {
      const imageBase64 = await blobToBase64(file)
      const session = await auth.getValidSession?.().catch(() => auth.session)
      const result = await postTutorSession({
        mode: 'ocr',
        imageBase64,
        mimeType: file.type || 'image/jpeg',
        sourceType: 'camera',
        languageCode: language.code,
        nativeLanguageCode: profile.nativeLanguage || 'en',
        tutorStyle: profile.tutorStyle || 'encouraging',
        includeAudio: false,
      }, session?.idToken || auth.session?.idToken || '')
      setCameraState({ loading: false, result, error: '' })
    } catch (error) {
      setCameraState({ loading: false, result: null, error: error.message || 'Camera translate unavailable.' })
    }
  }

  function startChallengeAttempt() {
    const Recognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setChallengeState({ listening: false, transcript: '', score: null })
      return
    }

    const recognition = new Recognition()
    recognition.lang = language.sttCode || language.locale || 'es-ES'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => setChallengeState({ listening: true, transcript: '', score: null })
    recognition.onerror = () => setChallengeState((current) => ({ ...current, listening: false }))
    recognition.onend = () => setChallengeState((current) => ({ ...current, listening: false }))
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim()
      const last = event.results[event.results.length - 1]
      setChallengeState((current) => ({ ...current, transcript }))
      if (last?.isFinal && transcript) {
        const expectedWords = dailyChallenge.textEs.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
        const heardWords = transcript.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
        const hits = expectedWords.filter((word) => heardWords.includes(word)).length
        const score = Math.max(42, Math.min(98, Math.round((hits / expectedWords.length) * 100)))
        setChallengeState({ listening: false, transcript, score })
        recognition.stop()
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  function handleQuickAction(id) {
    if (id === 'saved') {
      route.navigate('/downloads')
      return
    }
    if (id === 'shadowing') {
      route.navigate('/train')
      return
    }
    setSheet(id)
  }

  function playPhrase(phrase) {
    speakOffline(phrase.es, language.code, 0.86)
  }

  return (
    <AppShell auth={auth} route={route} section="home">
      <div
        className="min-h-full overflow-hidden"
        style={{
          background: COLORS.paper,
          color: COLORS.ink,
          fontFamily: '"Geist", system-ui, sans-serif',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(rgba(17,16,16,0.18) 0.45px, transparent 0.45px)', backgroundSize: '5px 5px', mixBlendMode: 'multiply' }} />

        <main className="relative z-10 space-y-5 pt-[calc(env(safe-area-inset-top)+62px)]">
          <section className="px-[22px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] leading-none" style={{ color: COLORS.muted }}>
                  Good morning, <span className="font-semibold" style={{ color: COLORS.ink2 }}>{userName}</span>
                </p>
                <h1 className="mt-4 max-w-[21rem] text-[33px] leading-[1.04]" style={{ color: COLORS.ink }}>
                  <Serif style={{ fontWeight: 380 }}>Start learning </Serif>
                  <Serif italic style={{ fontWeight: 340 }}>{language.label}</Serif>
                  <Serif style={{ fontWeight: 380 }}> by speaking naturally.</Serif>
                </h1>
              </div>
              <button
                type="button"
                onClick={() => route.navigate('/settings')}
                className="mt-[-2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/60"
                aria-label="Settings"
              >
                <Icon name="settings" size={19} stroke={1.55} />
              </button>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2 px-4">
            <StatCard icon="flame" label="Streak" value={`${profile.streakCount || 12} days`} />
            <StatCard icon="bolt" label="Today" value={`${profile.confidenceScore || 78} %`} active />
            <StatCard icon="trophy" label="Level" value={profile.confidenceLevel === 'conversational' ? 'B1 inter.' : `L${profile.level || 1}`} />
          </section>

          <ContinueHero
            lesson={currentLesson}
            isPlaying={isPlaying}
            onPlay={toggleLessonPlayback}
            onViewPlan={() => setSheet('plan')}
          />

          <QuickActions onAction={handleQuickAction} />

          <DailyChallenge
            challenge={dailyChallenge}
            onAttempt={() => {
              setSheet('challenge')
              window.setTimeout(startChallengeAttempt, 260)
            }}
          />

          <LanguageReach copy={copy} />

          <RecentPhrases
            phrases={RECENT_PHRASES}
            onSelect={(phrase) => {
              setSheet({ type: 'phrase', phrase })
              playPhrase(phrase)
            }}
          />

          <FooterQuote />
        </main>

        <AnimatePresence>
          {sheet === 'lookup' ? (
            <BottomSheet title="Quick lookup" onClose={() => setSheet(null)}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  runLookup(new FormData(event.currentTarget).get('query') || '')
                }}
                className="space-y-3"
              >
                <input
                  name="query"
                  autoFocus
                  placeholder="How do I order breakfast?"
                  className="w-full rounded-[18px] px-4 py-4 text-[15px] outline-none"
                  style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}` }}
                />
                <button type="submit" className="h-12 w-full rounded-full text-[14px] font-semibold" style={{ background: COLORS.ink, color: COLORS.paper }}>
                  Ask tutor
                </button>
              </form>
              {lookupState.loading ? <p className="mt-4 text-[13px]" style={{ color: COLORS.muted }}>Building a natural phrase...</p> : null}
              {lookupState.error ? <p className="mt-4 text-[13px]" style={{ color: '#A33A2B' }}>{lookupState.error}</p> : null}
              {lookupState.result ? (
                <div className="mt-4 rounded-[18px] p-4" style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}` }}>
                  <p className="text-[20px] leading-tight"><Serif>{lookupState.result.naturalPhrase}</Serif></p>
                  <p className="mt-2 font-mono text-[11px]" style={{ color: COLORS.amberDeep }}>{lookupState.result.phonetic}</p>
                  <p className="mt-3 text-[13px]" style={{ color: COLORS.muted }}>{lookupState.result.context || lookupState.result.pronunciationTip}</p>
                </div>
              ) : null}
            </BottomSheet>
          ) : null}

          {sheet === 'plan' ? (
            <BottomSheet title="Lesson plan" onClose={() => setSheet(null)}>
              <p className="text-[22px] leading-tight" style={{ color: COLORS.ink }}>
                <Serif style={{ fontWeight: 390 }}>{currentLesson.titleStart} </Serif>
                <Serif italic style={{ fontWeight: 340 }}>{currentLesson.titleAccent}</Serif>
                <Serif style={{ fontWeight: 390 }}> {currentLesson.titleEnd}</Serif>
              </p>
              <div className="mt-5 space-y-2.5">
                {currentLesson.plan.map((step, index) => (
                  <div
                    key={step.label}
                    className="flex gap-3 rounded-[18px] p-3"
                    style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}` }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                      style={{ background: COLORS.ink, color: COLORS.paper }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: COLORS.ink }}>{step.label}</p>
                      <p className="mt-1 text-[12.5px] leading-snug" style={{ color: COLORS.muted }}>{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSheet(null)
                  route.navigate('/train')
                }}
                className="mt-5 h-12 w-full rounded-full text-[14px] font-semibold"
                style={{ background: COLORS.ink, color: COLORS.paper }}
              >
                Start lesson
              </button>
            </BottomSheet>
          ) : null}

          {sheet === 'camera' ? (
            <BottomSheet title="Camera translate" onClose={() => setSheet(null)}>
              <label
                className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-[20px] text-center"
                style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}`, color: COLORS.muted }}
              >
                <Icon name="camera" size={24} stroke={1.6} />
                <span className="mt-2 text-[13px] font-semibold">Scan a menu, sign, or screen</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => runCameraOcr(event.target.files?.[0])}
                />
              </label>
              {cameraState.loading ? <p className="mt-4 text-[13px]" style={{ color: COLORS.muted }}>Reading the image...</p> : null}
              {cameraState.error ? <p className="mt-4 text-[13px]" style={{ color: '#A33A2B' }}>{cameraState.error}</p> : null}
              {cameraState.result ? (
                <div className="mt-4 rounded-[18px] p-4" style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}` }}>
                  <p className="text-[18px] leading-tight"><Serif>{cameraState.result.naturalPhrase}</Serif></p>
                  <p className="mt-2 font-mono text-[11px]" style={{ color: COLORS.amberDeep }}>{cameraState.result.phonetic}</p>
                  <p className="mt-3 text-[13px]" style={{ color: COLORS.muted }}>{cameraState.result.context || cameraState.result.extractedText}</p>
                </div>
              ) : null}
            </BottomSheet>
          ) : null}

          {sheet === 'challenge' ? (
            <BottomSheet title="Daily challenge" onClose={() => setSheet(null)}>
              <p className="text-[18px] leading-tight"><Serif>{dailyChallenge.textEs}</Serif></p>
              <p className="mt-3 font-mono text-[11px]" style={{ color: COLORS.amberDeep }}>{dailyChallenge.phonetic.join(' · ')}</p>
              <button
                type="button"
                onClick={startChallengeAttempt}
                className="mt-4 h-12 w-full rounded-full text-[14px] font-semibold"
                style={{ background: COLORS.ink, color: COLORS.paper }}
              >
                {challengeState.listening ? 'Listening...' : 'Try again'}
              </button>
              {challengeState.transcript ? (
                <p className="mt-4 text-[13px]" style={{ color: COLORS.muted }}>{challengeState.transcript}</p>
              ) : null}
              {challengeState.score !== null ? (
                <div className="mt-4 rounded-[18px] p-4" style={{ background: COLORS.paper, border: `0.5px solid ${COLORS.hair}` }}>
                  <p className="text-[26px] leading-none"><Serif>{challengeState.score}%</Serif></p>
                  <p className="mt-2 text-[13px]" style={{ color: COLORS.muted }}>
                    {challengeState.score >= 82 ? 'Strong. Keep the tr rhythm light and fast.' : 'Close. Slow down the tr sound, then speed it back up.'}
                  </p>
                </div>
              ) : null}
            </BottomSheet>
          ) : null}

          {sheet?.type === 'phrase' ? (
            <BottomSheet title="Recent phrase" onClose={() => setSheet(null)}>
              <p className="text-[23px] leading-tight"><Serif>{sheet.phrase.es}</Serif></p>
              <p className="mt-3 font-mono text-[11px]" style={{ color: COLORS.amberDeep }}>{sheet.phrase.phonetic}</p>
              <div className="my-4 h-px" style={{ background: COLORS.hair }} />
              <p className="text-[14px] italic" style={{ color: COLORS.muted }}>{sheet.phrase.en}</p>
              <button
                type="button"
                onClick={() => playPhrase(sheet.phrase)}
                className="mt-5 h-12 w-full rounded-full text-[14px] font-semibold"
                style={{ background: COLORS.ink, color: COLORS.paper }}
              >
                Play phrase
              </button>
            </BottomSheet>
          ) : null}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
