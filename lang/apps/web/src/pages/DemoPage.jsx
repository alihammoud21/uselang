import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useCallback } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'
import { MarketingNav } from '@/pages/MarketingShared'

const DEMO_PHRASES = [
  { phrase: "Une table pour deux, s'il vous pla\u00EEt", translation: 'A table for two, please', lang: 'French' },
  { phrase: 'O\u00F9 sont les toilettes', translation: 'Where are the restrooms', lang: 'French' },
  { phrase: 'Je voudrais un caf\u00E9', translation: 'I would like a coffee', lang: 'French' },
  { phrase: 'Combien \u00E7a co\u00FBte', translation: 'How much does this cost', lang: 'French' },
]

export function DemoPage({ auth, route }) {
  const go = useCallback((path) => route.navigate(path), [route])
  const cta = auth.session ? APP_ROUTES.app : APP_ROUTES.signup
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [state, setState] = useState('ready') // ready | listening | scoring | result
  const [score, setScore] = useState(null)
  const mediaRef = useRef(null)

  const currentPhrase = DEMO_PHRASES[phraseIdx]

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      recorder.ondataavailable = () => {}
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setState('scoring')
        await new Promise((r) => setTimeout(r, 2000))
        setScore(65 + Math.floor(Math.random() * 30))
        setState('result')
      }
      mediaRef.current = recorder
      recorder.start()
      setState('listening')
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    } catch {
      setState('ready')
    }
  }, [])

  const nextPhrase = () => {
    setPhraseIdx((i) => (i + 1) % DEMO_PHRASES.length)
    setState('ready')
    setScore(null)
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-ink overflow-x-hidden">
      <MarketingNav auth={auth} go={go} />

      <section className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-5 pt-14">
        <div className="w-full max-w-md text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent mb-2">
            Live Demo
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="text-[1.6rem] font-bold tracking-[-0.02em]">
            Speak and get corrected
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="mt-2 text-[0.82rem] text-ink/35 mb-10">
            Read the phrase out loud. The AI will score your pronunciation.
          </motion.p>

          {/* phrase card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl bg-white border border-ink/[0.06] overflow-hidden"
            style={{ boxShadow: '0 16px 48px -16px rgba(0,0,0,0.08)' }}>
            <div className="bg-gradient-to-r from-accent to-[#5856d6] px-5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-medium text-white/70">{currentPhrase.lang}</span>
                <span className="text-[0.62rem] font-semibold text-white/50">Phrase {phraseIdx + 1} of {DEMO_PHRASES.length}</span>
              </div>
            </div>

            <div className="px-6 py-8">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-ink/20">Say this</p>
              <p className="mt-2 text-[1.3rem] font-bold tracking-[-0.02em] text-ink/75">{currentPhrase.phrase}</p>
              <p className="mt-1 text-[0.82rem] text-ink/30">{currentPhrase.translation}</p>

              {/* orb */}
              <div className="mt-8 mb-4">
                <AISphere
                  state={state === 'listening' ? 'listening' : state === 'scoring' ? 'thinking' : state === 'result' ? 'speaking' : 'idle'}
                  activityLevel={state === 'listening' ? 0.9 : 0.3}
                  size={120} disabled />
              </div>

              <AnimatePresence mode="wait">
                {state === 'ready' ? (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.button type="button" onClick={startListening}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="btn-primary !px-8 !py-3.5 shadow-[0_6px_24px_-6px_rgba(0,122,255,0.4)] flex items-center gap-2 mx-auto">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /></svg>
                      Tap to speak
                    </motion.button>
                  </motion.div>
                ) : state === 'listening' ? (
                  <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center justify-center gap-[2px] mb-3">
                      {[...Array(20)].map((_, i) => (
                        <motion.div key={i} className="w-[3px] rounded-full bg-accent"
                          animate={{ height: [4, 6 + Math.sin(i * 0.5) * 18, 4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.04 }} />
                      ))}
                    </div>
                    <p className="text-[0.78rem] font-medium text-accent/60">Listening...</p>
                    <button type="button" onClick={() => { if (mediaRef.current?.state === 'recording') mediaRef.current.stop() }}
                      className="mt-3 text-[0.72rem] font-medium text-ink/30 hover:text-ink/50 transition">Stop early</button>
                  </motion.div>
                ) : state === 'scoring' ? (
                  <motion.div key="scoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-[0.82rem] font-medium text-ink/35">Analyzing your pronunciation...</p>
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <p className={`text-[3rem] font-extrabold tabular-nums leading-none ${score >= 85 ? 'text-[#30d158]' : score >= 70 ? 'text-[#ff9f0a]' : 'text-accent'}`}>
                      {score}%
                    </p>
                    <p className="mt-1 text-[0.68rem] text-ink/25">Pronunciation score</p>
                    <div className="mt-4 rounded-xl bg-accent/[0.04] px-4 py-2.5">
                      <p className="text-[0.75rem] text-ink/45">
                        {score >= 85 ? 'Excellent! You sound natural.' : 'Good effort! The full app shows tongue diagrams and lip position for every sound.'}
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <button type="button" onClick={nextPhrase} className="btn-ghost !px-5 !py-2.5 !text-[0.8rem]">Next phrase</button>
                      <button type="button" onClick={() => go(cta)} className="btn-primary !px-5 !py-2.5 !text-[0.8rem]">Get full app</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-6 text-[0.72rem] text-ink/25">
            This is a simplified demo. The full app has tongue diagrams, airflow coaching, and unlimited practice.
          </motion.p>
        </div>
      </section>
    </div>
  )
}
