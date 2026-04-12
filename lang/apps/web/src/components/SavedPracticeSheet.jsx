import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'

function formatRelative(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function SavedPracticeSheet({ items, isOnline, onClose, onRemove }) {
  const [playingId, setPlayingId] = useState(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = useRef(null)
  const urlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      revokeObjectUrl(urlRef.current)
    }
  }, [])

  async function play(item, rate) {
    if (audioRef.current) audioRef.current.pause()
    revokeObjectUrl(urlRef.current)
    const url = createObjectUrl(item.audioBlob)
    if (!url) return
    urlRef.current = url
    const audio = new Audio(url)
    audio.playbackRate = rate || playbackRate || 1
    audioRef.current = audio
    setPlayingId(item.id)
    await audio.play()
    audio.addEventListener('ended', () => {
      setPlayingId(null)
      revokeObjectUrl(urlRef.current)
      urlRef.current = null
    }, { once: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="glass-strong flex max-h-[82%] w-full flex-col rounded-t-[2rem] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pt-4">
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/15" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-ink/35">Saved offline</p>
              <h3 className="mt-2 font-display text-[1.3rem] font-semibold tracking-[-0.03em] text-ink">
                Downloaded practice
              </h3>
              <p className="mt-1 text-[0.78rem] leading-snug text-ink/45">
                {items.length
                  ? 'These work without a connection.'
                  : 'Download a phrase to keep it offline.'}
              </p>
            </div>
            <span className={`shrink-0 text-[0.66rem] font-medium ${isOnline ? 'text-mint' : 'text-amber'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {items.length ? (
            <div className="mt-4 flex items-center gap-2">
              {[0.6, 0.85, 1].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`rounded-full px-3 py-1.5 text-[0.7rem] font-medium transition ${
                    playbackRate === rate ? 'bg-ink text-paper' : 'bg-white/5 text-ink/50'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto px-5 pb-2">
          {items.map((item) => {
            const active = playingId === item.id
            return (
              <article
                key={item.id}
                className={`rounded-[1.3rem] p-4 transition ${
                  active ? 'bg-white/[0.06]' : 'bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {item.scenarioLabel ? (
                      <p className="eyebrow text-ink/35">{item.scenarioLabel}</p>
                    ) : null}
                    <p className="mt-1 font-display text-[0.94rem] font-semibold leading-snug text-ink">
                      {item.sentence}
                    </p>
                    {item.phonetic ? (
                      <p className="mt-1 font-serif text-[0.82rem] text-ink/40">/ {item.phonetic} /</p>
                    ) : null}
                  </div>
                  <span className="text-[0.62rem] text-ink/30">{item.synced ? 'Synced' : 'Local'}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => play(item)}
                    className="btn-primary flex-1 !py-2"
                  >
                    {active ? 'Playing' : 'Play'}
                  </button>
                  <button type="button" onClick={() => play(item, 0.6)} className="btn-ghost !py-2">
                    Slow
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink/40 transition hover:text-accent"
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>

                <p className="mt-2 text-right text-[0.64rem] text-ink/25">{formatRelative(item.createdAt)}</p>
              </article>
            )
          })}

          {!items.length ? (
            <div className="rounded-[1.3rem] bg-white/[0.02] p-6 text-center">
              <p className="text-[0.84rem] leading-snug text-ink/40">
                Nothing saved yet. Download a phrase to keep the coach version offline.
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
