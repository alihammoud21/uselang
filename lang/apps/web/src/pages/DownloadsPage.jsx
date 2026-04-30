import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { AppShell } from '@/components/AppShell'
import { useOfflinePractice } from '@/hooks/use-offline-practice'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'
import { APP_ROUTES } from '@/lib/routes'

export function DownloadsPage({ auth, route }) {
  const profile    = auth.profile ?? { languageLearning: 'en' }
  const [filter, setFilter]       = useState('all')
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)
  const urlRef   = useRef(null)
  const offline  = useOfflinePractice({ idToken: auth.session?.idToken })

  const languageCode = profile.languageLearning || 'en'
  const language     = SUPPORTED_LANGUAGES.find((e) => e.code === languageCode) || SUPPORTED_LANGUAGES[0]

  const filteredItems = useMemo(() => {
    if (filter === 'language') return offline.items.filter((item) => item.language === language.label)
    if (filter === 'recent')   return offline.items.slice(0, 8)
    return offline.items
  }, [filter, language.label, offline.items])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const key = item.scenarioLabel || 'Saved practice'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
      return groups
    }, {})
  }, [filteredItems])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      revokeObjectUrl(urlRef.current)
    }
  }, [])

  async function playItem(item, source = 'coach', rate = 1) {
    audioRef.current?.pause()
    revokeObjectUrl(urlRef.current)
    const blob = source === 'user' ? item.userAudioBlob : item.audioBlob
    const url  = createObjectUrl(blob)
    if (!url) return
    urlRef.current = url
    const audio = new Audio(url)
    audio.playbackRate = rate
    audioRef.current = audio
    setPlayingId(`${item.id}-${source}`)
    await audio.play()
    audio.addEventListener('ended', () => {
      setPlayingId(null)
      revokeObjectUrl(urlRef.current)
      urlRef.current = null
    }, { once: true })
  }

  return (
    <AppShell auth={auth} route={route} section="downloads">
      {/* ── Header ── */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.35rem)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink/30">
              Library
            </p>
            <h1 className="mt-1.5 text-[2rem] font-bold leading-none tracking-[-0.04em] text-ink">
              Saved practice.
            </h1>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-2 w-2 rounded-full"
              style={{ background: offline.isOnline ? '#30d158' : '#ff9f0a' }}
            />
            <span className="text-[0.72rem] font-medium text-ink/40">
              {offline.isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="text-[0.72rem] text-ink/25">· {offline.items.length} saved</span>
          </div>
        </div>

        {/* ── Filter chips ── */}
        <div className="mt-4 flex gap-2">
          {[
            { id: 'all',      label: 'All' },
            { id: 'language', label: language.label },
            { id: 'recent',   label: 'Recent' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className="rounded-full px-3.5 py-1.5 text-[0.72rem] font-medium transition"
              style={{
                background: filter === id ? '#1a1714' : 'rgba(0,0,0,0.05)',
                color:      filter === id ? '#fff'     : 'rgba(15,20,25,0.5)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Items ── */}
      <div className="px-5 pb-6 pt-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredItems.length ? (
            Object.entries(groupedItems).map(([label, items]) => (
              <motion.div
                key={label}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-7"
              >
                <p className="mb-3 font-serif text-[0.88rem] italic text-ink/36">{label}</p>
                <div className="overflow-hidden rounded-[1.5rem] bg-white/88" style={{ boxShadow: '0 8px 28px -14px rgba(15,20,25,0.12)' }}>
                  {items.map((item, i) => (
                    <SavedRow
                      key={item.id}
                      item={item}
                      playingId={playingId}
                      onPlay={playItem}
                      onRemove={() => offline.removePractice(item.id)}
                      isLast={i === items.length - 1}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <EmptyState onGoTrain={() => route.navigate(APP_ROUTES.app)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

/* ─── Saved row ─────────────────────────────────────────────────── */
function SavedRow({ item, playingId, onPlay, onRemove, isLast }) {
  const coachPlaying = playingId === `${item.id}-coach`
  const userPlaying  = playingId === `${item.id}-user`

  return (
    <motion.article
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`px-4 py-3.5 ${!isLast ? 'border-b border-black/[0.045]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.92rem] font-semibold leading-snug text-ink">{item.sentence}</p>
          {item.translation && (
            <p className="mt-0.5 text-[0.78rem] leading-snug text-ink/42">{item.translation}</p>
          )}
          {item.phonetic && (
            <p className="mt-0.5 font-serif text-[0.74rem] italic text-ink/30">/{item.phonetic}/</p>
          )}
        </div>

        {/* action cluster */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Slow */}
          <button
            type="button"
            onClick={() => onPlay(item, 'coach', 0.82)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-ink/40 transition hover:bg-black/[0.07]"
            title="Play slow"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M17 14l-5-5-5 5" />
            </svg>
          </button>

          {/* Coach play */}
          <button
            type="button"
            onClick={() => onPlay(item, 'coach')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition"
            style={{
              background: coachPlaying ? '#1a1714' : 'rgba(0,0,0,0.06)',
              color:      coachPlaying ? '#fff'     : '#0f1419',
            }}
            title="Play coach"
          >
            {coachPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Your voice */}
          <button
            type="button"
            onClick={() => onPlay(item, 'user')}
            disabled={!item.userAudioBlob}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-ink/40 transition hover:bg-black/[0.07] disabled:opacity-25"
            title="Play your recording"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={userPlaying ? '#30d158' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0" />
              <path d="M12 18v3" />
            </svg>
          </button>

          {/* Remove */}
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.03] text-ink/25 transition hover:bg-danger/8 hover:text-danger"
            title="Remove"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      {item.language && (
        <p className="mt-1.5 text-[0.64rem] font-medium uppercase tracking-[0.04em] text-ink/22">
          {item.language}
        </p>
      )}
    </motion.article>
  )
}

/* ─── Empty state ──────────────────────────────────────────────── */
function EmptyState({ onGoTrain }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(201,169,122,0.1)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a97a" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <p className="mt-4 text-[0.95rem] font-semibold text-ink">Nothing saved yet</p>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-[0.82rem] leading-snug text-ink/38">
        Download a phrase in Train and it will appear here for offline replay.
      </p>
      <button
        type="button"
        onClick={onGoTrain}
        className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[0.82rem] font-semibold text-white"
      >
        Go to Train
      </button>
    </div>
  )
}
