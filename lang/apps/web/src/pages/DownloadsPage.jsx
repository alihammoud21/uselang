import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { AppShell } from '@/components/AppShell'
import { useOfflinePractice } from '@/hooks/use-offline-practice'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'
import { APP_ROUTES } from '@/lib/routes'

export function DownloadsPage({ auth, route }) {
  const profile = auth.profile ?? { languageLearning: 'en' }
  const [filter, setFilter] = useState('all')
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)
  const urlRef = useRef(null)
  const offline = useOfflinePractice({ idToken: auth.session?.idToken })

  const languageCode = profile.languageLearning || 'en'
  const language = SUPPORTED_LANGUAGES.find((entry) => entry.code === languageCode) || SUPPORTED_LANGUAGES[0]

  const filteredItems = useMemo(() => {
    if (filter === 'language') {
      return offline.items.filter((item) => item.language === language.label)
    }
    if (filter === 'recent') {
      return offline.items.slice(0, 8)
    }
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
    const url = createObjectUrl(blob)
    if (!url) return
    urlRef.current = url
    const audio = new Audio(url)
    audio.playbackRate = rate
    audioRef.current = audio
    setPlayingId(`${item.id}-${source}`)
    await audio.play()
    audio.addEventListener(
      'ended',
      () => {
        setPlayingId(null)
        revokeObjectUrl(urlRef.current)
        urlRef.current = null
      },
      { once: true },
    )
  }

  return (
    <AppShell auth={auth} route={route} section="downloads">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.35rem)]">
        <div className="flex items-center justify-between text-[0.72rem] font-medium text-ink/35">
          <span>Library</span>
          <span>{offline.items.length} saved</span>
          <span>{offline.isOnline ? 'Synced' : 'Offline'}</span>
        </div>
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="text-center">
          <p className="text-[0.74rem] font-medium uppercase tracking-[0.04em] text-accent/55">
            Replay
          </p>
          <h1 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-[-0.035em] text-ink">
            Your saved practice
          </h1>
          <p className="mx-auto mt-2 max-w-[16rem] text-[0.84rem] leading-snug text-ink/38">
            Replay coach audio, compare your own take, and keep the essentials ready offline.
          </p>
        </div>

        <section
          className="mt-6 rounded-[1.65rem] bg-white/86 p-4"
          style={{ boxShadow: '0 12px 36px -20px rgba(15, 20, 25, 0.14)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                Offline status
              </p>
              <p className="mt-1 text-[0.92rem] font-semibold text-ink">
                {offline.isOnline ? 'Everything is ready' : 'Offline replay only'}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium ${
                offline.isOnline ? 'bg-mint/12 text-mint' : 'bg-amber/[0.12] text-amber'
              }`}
            >
              {offline.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterChip>
            <FilterChip active={filter === 'language'} onClick={() => setFilter('language')}>
              {language.label}
            </FilterChip>
            <FilterChip active={filter === 'recent'} onClick={() => setFilter('recent')}>
              Recent
            </FilterChip>
          </div>
        </section>

        <section className="mt-5 space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredItems.length ? (
              Object.entries(groupedItems).map(([label, items]) => (
                <motion.div
                  key={label}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  <div className="px-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[0.72rem] text-ink/35">
                      {items.length} saved phrase{items.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {items.map((item) => (
                    <SavedCard
                      key={item.id}
                      item={item}
                      playingId={playingId}
                      onPlay={playItem}
                      onRemove={() => offline.removePractice(item.id)}
                    />
                  ))}
                </motion.div>
              ))
            ) : (
              <EmptyState onGoTrain={() => route.navigate(APP_ROUTES.trainer)} />
            )}
          </AnimatePresence>
        </section>
      </div>
    </AppShell>
  )
}

function SavedCard({ item, playingId, onPlay, onRemove }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-[1.45rem] bg-white/86 p-4"
      style={{ boxShadow: '0 12px 34px -20px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
            {item.language || 'Saved'} · {item.scenarioLabel || 'Train'}
          </p>
          <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-ink">{item.sentence}</p>
          {item.translation ? (
            <p className="mt-1 text-[0.78rem] leading-snug text-ink/42">{item.translation}</p>
          ) : null}
          {item.phonetic ? (
            <p className="mt-0.5 font-serif text-[0.76rem] text-ink/34">/{item.phonetic}/</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-ink/30"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onPlay(item, 'coach')} className="btn-primary !py-2.5 !text-[0.76rem]">
          {playingId === `${item.id}-coach` ? 'Playing...' : 'Coach'}
        </button>
        <button type="button" onClick={() => onPlay(item, 'coach', 0.82)} className="btn-ghost !py-2.5 !text-[0.76rem]">
          Slow
        </button>
        <button
          type="button"
          onClick={() => onPlay(item, 'user')}
          disabled={!item.userAudioBlob}
          className="btn-ghost !py-2.5 !text-[0.76rem] disabled:opacity-30"
        >
          {playingId === `${item.id}-user` ? 'Playing...' : 'You'}
        </button>
      </div>
    </motion.article>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition ${
        active ? 'bg-accent text-white' : 'bg-ink/[0.04] text-ink/45'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ onGoTrain }) {
  return (
    <div
      className="rounded-[1.45rem] bg-white/86 px-5 py-6 text-center"
      style={{ boxShadow: '0 12px 34px -20px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink/[0.04] text-ink/25">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <p className="mt-3 text-[0.9rem] font-semibold text-ink">Nothing saved yet</p>
      <p className="mx-auto mt-2 max-w-[15rem] text-[0.82rem] leading-snug text-ink/38">
        Download a phrase in Train and it will stay here for offline replay.
      </p>
      <button type="button" onClick={onGoTrain} className="btn-primary mt-4 !py-2.5 !text-[0.8rem]">
        Go to Train
      </button>
    </div>
  )
}
