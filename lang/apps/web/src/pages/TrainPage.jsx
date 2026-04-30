import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AISphere } from '@/components/AISphere'
import { AppShell } from '@/components/AppShell'
import { PronunciationDiagram } from '@/components/PronunciationDiagram'
import { speakOffline, stopOfflineSpeech } from '@/lib/speech-synthesis'
import { SUPPORTED_LANGUAGES } from '@shared/languages'

/* ─── Phrase banks ────────────────────────────────────────────────────── */
const QUICK_PHRASES = {
  fr: [
    { phrase: 'Bonjour', phonetic: 'bohn-ZHOOR', tip: 'The J is soft — like the "s" in "measure"', tonguePos: 'Tongue tip rests behind lower teeth', lips: 'Slightly parted, relaxed' },
    { phrase: 'Je voudrais', phonetic: 'zhuh voo-DREH', tip: '"Je" starts with that soft zh sound', tonguePos: 'Flat in the middle of your mouth', lips: 'Round slightly on "voudrais"' },
    { phrase: 'Merci beaucoup', phonetic: 'mehr-SEE boh-KOO', tip: 'The r is throaty, not rolled', tonguePos: 'Back of tongue lifts toward throat for R', lips: 'Open and relaxed' },
    { phrase: 'Où est la gare', phonetic: 'oo-EH lah GAHR', tip: 'Où is just a pure "oo" sound', tonguePos: 'Tongue forward for "où"', lips: 'Rounded tightly for "où"' },
  ],
  es: [
    { phrase: 'Buenos días', phonetic: 'BWEH-nos DEE-as', tip: 'The B is soft between vowels', tonguePos: 'Relaxed, near the center', lips: 'Slightly open on "días"' },
    { phrase: 'Por favor', phonetic: 'por fah-VOR', tip: 'Roll the R in "por"', tonguePos: 'Tongue tip vibrates against the ridge', lips: 'Neutral' },
  ],
  zh: [
    { phrase: '你好', phonetic: 'nǐ hǎo (nee-HOW)', tip: 'Tone 3 dips down then rises', tonguePos: 'Flat and relaxed', lips: 'Wide smile shape' },
    { phrase: '谢谢', phonetic: 'xiè xiè (SHYEH-shyeh)', tip: 'The x is like "sh" but lighter', tonguePos: 'Tip down, middle raised', lips: 'Wide' },
  ],
}

const REGULAR_LESSON_STEPS = {
  fr: [
    { id: 'welcome', ai: "Bonjour! I'm your French tutor. Are you a complete beginner, or have you learned some French before?", awaitResponse: true },
    { id: 'greetings_intro', ai: "Great! Let's start with greetings. The most important word in French is Bonjour — it means hello. Say it with me: Bonjour.", awaitResponse: false, speakPhrase: 'Bonjour', phraseIdx: 0 },
    { id: 'greetings_practice', ai: "Now it's your turn. Say Bonjour to me.", awaitResponse: true, targetPhrase: 'bonjour' },
    { id: 'intro_phrases', ai: "Excellent! Now let's try a full greeting: Bonjour, je m'appelle... and then your name. I'll say it first.", awaitResponse: false, speakPhrase: "Bonjour, je m'appelle", phraseIdx: -1 },
    { id: 'practice_full', ai: "Your turn! Say: Bonjour, je m'appelle, and then your name.", awaitResponse: true },
    { id: 'conversation', ai: "You're doing great. Let's have a short conversation. I'll ask you something, and you answer. Ready? Comment tu t'appelles?", awaitResponse: true },
    { id: 'wrap', ai: "Fantastic work today! You've learned how to greet someone in French and introduce yourself. Keep practicing tonight!", awaitResponse: false },
  ],
}

const LANGUAGES = SUPPORTED_LANGUAGES?.length > 0
  ? SUPPORTED_LANGUAGES
  : [
      { code: 'fr', label: 'French' },
      { code: 'es', label: 'Spanish' },
      { code: 'zh', label: 'Mandarin' },
      { code: 'ar', label: 'Arabic' },
      { code: 'it', label: 'Italian' },
      { code: 'de', label: 'German' },
      { code: 'ja', label: 'Japanese' },
      { code: 'ko', label: 'Korean' },
      { code: 'pt', label: 'Portuguese' },
    ]

const LESSON_DURATION = 15 * 60 // 15 minutes in seconds

/* ─── Homework data ───────────────────────────────────────────────────── */
function buildHomework(lang) {
  const base = {
    fr: [
      { id: 'hw1', task: 'Say "Bonjour" clearly 5 times, recording yourself' },
      { id: 'hw2', task: 'Practice "Je m\'appelle [name]" until it feels natural' },
      { id: 'hw3', task: 'Mini quiz: match 5 French greetings to their English meaning' },
      { id: 'hw4', task: 'Listen to one French song and pick out any words you recognize' },
    ],
    es: [
      { id: 'hw1', task: 'Roll your R in "gracias" 10 times' },
      { id: 'hw2', task: 'Practice "Buenos días / Buenas tardes / Buenas noches"' },
      { id: 'hw3', task: 'Mini quiz: 5 Spanish greetings' },
    ],
    default: [
      { id: 'hw1', task: 'Repeat today\'s 3 key phrases before bed' },
      { id: 'hw2', task: 'Record yourself saying each phrase once' },
      { id: 'hw3', task: 'Mini quiz: 5 vocabulary words from today\'s lesson' },
    ],
  }
  return (base[lang] || base.default).map((h) => ({ ...h, done: false }))
}

/* ─── AI Response simulator ───────────────────────────────────────────── */
const FEEDBACK_POOL = [
  "That was good! Focus on softening that last consonant.",
  "Nice! Your intonation is coming through. Try again with a bit more confidence.",
  "Really close! The vowel in the middle — make it shorter and crisper.",
  "Great effort. Native speakers would understand you completely.",
  "Almost perfect! Just watch the nasal tone at the end.",
]

function getQuickResponse(userText, lang) {
  const phrases = QUICK_PHRASES[lang] || QUICK_PHRASES.fr
  const q = userText.toLowerCase()
  const matched = phrases.find(() =>
    q.includes('say') || q.includes('how') || q.includes('what')
  )
  const target = matched || phrases[0]
  return {
    aiText: `In ${LANGUAGES.find((l) => l.code === lang)?.label || 'French'}, that's: "${target.phrase}". Let me say it for you.`,
    speakPhrase: target.phrase,
    tip: target,
  }
}

function getFeedback() {
  return FEEDBACK_POOL[Math.floor(Math.random() * FEEDBACK_POOL.length)]
}

/* ─── Liquid Glass Tip Popup ──────────────────────────────────────────── */
function PronunciationTip({ tip, onDismiss }) {
  if (!tip) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.94 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className="absolute inset-x-4 bottom-[5.5rem] z-50 overflow-hidden rounded-[1.8rem]"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: '0 8px 40px -8px rgba(60,45,25,0.18), inset 0 1px 0 rgba(255,255,255,0.85)',
        border: '1.5px solid rgba(255,255,255,0.6)',
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#c9a97a]">Pronunciation tip</span>
            </div>
            <h3 className="text-[1.3rem] font-semibold tracking-[-0.04em] text-[#1a1510]">
              {tip.phrase}
            </h3>
            <p className="mt-0.5 text-[0.78rem] font-medium text-[#5a5048]">
              /{tip.phonetic}/
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-[#8a8078]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2.5 rounded-[1rem] bg-[#faf7f2] px-3.5 py-2.5">
            <span className="mt-0.5 text-base">👅</span>
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#c9a97a]">Tongue</p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-[#3a332a]">{tip.tonguePos}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-[1rem] bg-[#faf7f2] px-3.5 py-2.5">
            <span className="mt-0.5 text-base">💋</span>
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#c9a97a]">Lips</p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-[#3a332a]">{tip.lips}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-[1rem] bg-[#eef5ff] px-3.5 py-2.5">
            <span className="mt-0.5 text-base">💡</span>
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#4c7fd8]">Native tip</p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-[#3a332a]">{tip.tip}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-[1.2rem] bg-[#1a1510] py-3 text-[0.86rem] font-semibold text-white active:scale-[0.98]"
        >
          Got it ✓
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Homework Screen ─────────────────────────────────────────────────── */
function HomeworkScreen({ lang, onClose }) {
  const [items, setItems] = useState(buildHomework(lang))
  const completed = items.filter((h) => h.done).length

  function toggle(id) {
    setItems((prev) => prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h)))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%)',
      }}
    >
      <div className="flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#c9a97a]/15">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#1a1510]">Tonight's homework</h1>
          <p className="mt-1.5 text-[0.88rem] text-[#8a8078]">
            Short, simple practice — takes less than 10 minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 rounded-[1.4rem] bg-white/80 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#c9a97a]">Progress</span>
            <span className="text-[0.8rem] font-medium text-[#5a5048]">{completed}/{items.length}</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#c9a97a]"
              animate={{ width: `${(completed / items.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Homework items */}
        <div className="space-y-3">
          {items.map((hw, i) => (
            <motion.button
              key={hw.id}
              type="button"
              onClick={() => toggle(hw.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-start gap-3.5 rounded-[1.4rem] bg-white/80 px-4 py-4 text-left shadow-sm active:scale-[0.98] transition-all"
            >
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                hw.done
                  ? 'border-[#c9a97a] bg-[#c9a97a]'
                  : 'border-[#d8d0c4] bg-transparent'
              }`}>
                {hw.done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p className={`flex-1 text-[0.9rem] leading-snug transition-colors ${
                hw.done ? 'text-[#a09888] line-through' : 'text-[#2a2218]'
              }`}>
                {hw.task}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Remind me */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-[1.2rem] bg-white/80 py-3.5 text-[0.86rem] font-medium text-[#5a5048] shadow-sm active:scale-[0.98]"
            onClick={onClose}
          >
            Remind me tonight
          </button>
          <button
            type="button"
            className="rounded-[1.2rem] bg-[#1a1510] py-3.5 text-[0.86rem] font-semibold text-white active:scale-[0.98]"
            onClick={onClose}
          >
            Start now →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Status Badge ────────────────────────────────────────────────────── */
function StatusBadge({ state, userSpeaking }) {
  const texts = {
    idle: 'Tap the mic to start',
    listening: 'UseLang is listening…',
    thinking: 'UseLang is thinking…',
    speaking: 'UseLang is speaking…',
  }

  const colors = {
    idle: 'bg-black/[0.06] text-[#8a8078]',
    listening: 'bg-[#eef5ff] text-[#4c7fd8]',
    thinking: 'bg-[#f5f2ff] text-[#7c5cbf]',
    speaking: 'bg-[#f0faf2] text-[#2d8b52]',
  }

  const dots = state === 'thinking' || state === 'speaking'
  const display = userSpeaking ? 'You are speaking…' : (texts[state] || texts.idle)
  const color = userSpeaking ? 'bg-[#fff4e8] text-[#c9a97a]' : (colors[state] || colors.idle)

  return (
    <motion.div
      key={display}
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-[0.78rem] font-semibold ${color}`}
    >
      {dots && (
        <span className="flex gap-1">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, delay: d * 0.2, repeat: Infinity }}
            />
          ))}
        </span>
      )}
      {userSpeaking && (
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-[#c9a97a]"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
      {display}
    </motion.div>
  )
}

/* ─── Transcript line ─────────────────────────────────────────────────── */
function TranscriptLine({ role, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-2.5 py-1.5"
    >
      <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
        role === 'ai'
          ? 'bg-[#c9a97a]/20 text-[#c9a97a]'
          : 'bg-[#eef5ff] text-[#4c7fd8]'
      }`}>
        {role === 'ai' ? 'AI' : 'U'}
      </span>
      <p className={`flex-1 text-[0.88rem] leading-snug ${
        role === 'ai' ? 'text-[#2a2218] font-medium' : 'text-[#5a5048]'
      }`}>
        {text}
      </p>
    </motion.div>
  )
}

/* ─── Main TrainPage ──────────────────────────────────────────────────── */
export function TrainPage({ auth, route }) {
  const profile = auth?.profile ?? { languageLearning: 'fr', confidenceScore: 18 }
  const [langCode, setLangCode] = useState(profile.languageLearning || 'fr')
  const language = LANGUAGES.find((l) => l.code === langCode) || LANGUAGES[0]

  const [mode, setMode] = useState('regular') // 'quick' | 'regular'
  const [aiState, setAiState] = useState('idle') // 'idle' | 'thinking' | 'speaking'
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([]) // [{role, text}]
  const [currentTip, setCurrentTip] = useState(null)
  const [showHomework, setShowHomework] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(LESSON_DURATION)
  const [stepIdx, setStepIdx] = useState(0)
  const [showLangPicker, setShowLangPicker] = useState(false)

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptBottomRef = useRef(null)

  const addMessage = useCallback((role, text) => {
    setTranscript((prev) => [...prev.slice(-8), { role, text, id: Date.now() }])
  }, [])

  /* ── Timer ──
     Only counts down during active user speaking. Silence and tutor-speaking
     don't punish the timer — per the "only speaking time counts" rule. */
  useEffect(() => {
    if (!sessionStarted || showHomework) return
    if (!userSpeaking) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setShowHomework(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [sessionStarted, showHomework, userSpeaking])

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.()
      stopOfflineSpeech()
      clearInterval(timerRef.current)
    }
  }, [])

  /* ── AI speak helper ── */
  const aiSpeak = useCallback(async (text, onDone) => {
    setAiState('thinking')
    addMessage('ai', text)
    await new Promise((r) => setTimeout(r, 800))
    setAiState('speaking')
    speakOffline(text, 'en', 0.88)
    const est = Math.max(1500, text.length * 55)
    await new Promise((r) => setTimeout(r, est))
    setAiState('idle')
    onDone?.()
  }, [addMessage])

  /* ── Start session ── */
  async function startSession() {
    setSessionStarted(true)
    setTimeLeft(LESSON_DURATION)
    setTranscript([])
    setStepIdx(0)

    if (mode === 'quick') {
      await aiSpeak(`Hey! I'm your ${language.label} tutor. What do you want to say? Ask me anything — like "how do I order coffee?" or "how do I say thank you?".`, null)
    } else {
      const steps = REGULAR_LESSON_STEPS[langCode] || REGULAR_LESSON_STEPS.fr
      await aiSpeak(steps[0].ai, null)
    }
  }

  /* ── Start listening ── */
  function startListening() {
    if (!sessionStarted) {
      startSession()
      return
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return

    if (recognitionRef.current && userSpeaking) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setUserSpeaking(true)
    recognition.onend = () => setUserSpeaking(false)
    recognition.onerror = () => setUserSpeaking(false)

    recognition.onresult = async (event) => {
      const userText = event.results[0]?.[0]?.transcript || ''
      if (!userText.trim()) return
      addMessage('user', userText)
      await handleUserInput(userText)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  /* ── Handle user input ── */
  async function handleUserInput(userText) {
    if (mode === 'quick') {
      // Quick mode: interpret request, give phrase, ask to repeat
      const response = getQuickResponse(userText, langCode)
      await aiSpeak(response.aiText, null)

      // Small pause, then show tip and ask to repeat
      await new Promise((r) => setTimeout(r, 400))
      setCurrentTip(response.tip)
      await aiSpeak(`Now you try. Say "${response.tip.phrase}".`, null)
    } else {
      // Regular mode: advance lesson step
      const steps = REGULAR_LESSON_STEPS[langCode] || REGULAR_LESSON_STEPS.fr
      const nextStep = stepIdx + 1

      if (nextStep >= steps.length) {
        // End of lesson
        await aiSpeak("Excellent work today! You've completed the lesson. Let me give you some homework to practice tonight.", null)
        setTimeout(() => setShowHomework(true), 800)
        return
      }

      setStepIdx(nextStep)
      const step = steps[nextStep]

      // Give feedback first
      const feedback = getFeedback()
      await aiSpeak(feedback, null)
      await new Promise((r) => setTimeout(r, 300))
      await aiSpeak(step.ai, null)

      if (step.speakPhrase) {
        await new Promise((r) => setTimeout(r, 400))
        speakOffline(step.speakPhrase, langCode, 0.8)
        // Show tip if available
        const phrases = QUICK_PHRASES[langCode] || QUICK_PHRASES.fr
        const match = phrases.find((p) => p.phrase.toLowerCase() === step.speakPhrase.toLowerCase())
        if (match) setCurrentTip(match)
      }
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = 1 - timeLeft / LESSON_DURATION
  const sphereState = userSpeaking ? 'listening' : aiState === 'speaking' ? 'speaking' : aiState === 'thinking' ? 'thinking' : 'idle'

  return (
    <AppShell auth={auth} route={route} section="train">
      <div
        className="relative flex min-h-full flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f5efe7 60%, #f0ebe4 100%)' }}
      >

        {/* ── Language picker modal ── */}
        <AnimatePresence>
          {showLangPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm"
              onClick={() => setShowLangPicker(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="mt-auto rounded-t-[2rem] bg-[#faf8f5] px-5 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[#1a1510]">Pick a language</h3>
                  <button type="button" onClick={() => setShowLangPicker(false)} className="text-[#8a8078]">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pb-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => { setLangCode(l.code); setShowLangPicker(false); setSessionStarted(false); setTranscript([]); }}
                      className={`rounded-[1.2rem] px-4 py-3 text-left transition-all active:scale-[0.97] ${
                        langCode === l.code
                          ? 'bg-[#1a1510] text-white'
                          : 'bg-white text-[#2a2218] shadow-sm'
                      }`}
                    >
                      <p className="text-[0.9rem] font-semibold">{l.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Top bar ── */}
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+0.8rem)]">
          {/* Language + timer row */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setShowLangPicker(true)}
              className="flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 text-[0.78rem] font-medium text-[#5a5048] shadow-sm active:scale-[0.97]"
            >
              {language.label}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-50">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>

            {sessionStarted && (
              <span className={`text-[0.78rem] font-semibold tabular-nums ${timeLeft < 120 ? 'text-[#e05a2b]' : 'text-[#8a8078]'}`}>
                {formatTime(timeLeft)}
              </span>
            )}

            {sessionStarted && (
              <button
                type="button"
                onClick={() => setShowHomework(true)}
                className="rounded-full bg-white/70 px-3.5 py-1.5 text-[0.78rem] font-medium text-[#8a8078] shadow-sm"
              >
                End
              </button>
            )}
          </div>

          {/* Progress bar */}
          {sessionStarted && (
            <div className="mb-3 h-[3px] overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #c9a97a, #79aafb)' }}
                animate={{ width: `${Math.max(2, progress * 100)}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex justify-center">
            <div className="flex rounded-full bg-black/[0.06] p-1">
              {['quick', 'regular'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setSessionStarted(false); setTranscript([]); }}
                  className={`rounded-full px-5 py-2 text-[0.8rem] font-semibold capitalize transition-all duration-200 ${
                    mode === m
                      ? 'bg-white text-[#1a1510] shadow-sm'
                      : 'text-[#8a8078]'
                  }`}
                >
                  {m === 'quick' ? '⚡ Quick' : '📖 Regular'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-4">
          {/* Status badge */}
          <div className="mb-6">
            <StatusBadge state={aiState} userSpeaking={userSpeaking} />
          </div>

          {/* AI Sphere */}
          <AISphere
            state={sphereState}
            onTap={startListening}
            hideLabel
            size={200}
            activityLevel={userSpeaking || aiState !== 'idle' ? 0.85 : 0.2}
            tone="accent"
          />

          {/* Mode description when idle */}
          {!sessionStarted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center"
            >
              <p className="text-[0.92rem] font-semibold text-[#2a2218]">
                {mode === 'quick' ? 'Quick Mode' : 'Lesson Mode'}
              </p>
              <p className="mt-1 max-w-[16rem] text-[0.82rem] leading-relaxed text-[#8a8078]">
                {mode === 'quick'
                  ? 'Ask how to say anything. AI corrects your pronunciation in real-time.'
                  : 'Guided 15-minute lesson with your AI tutor. Ends with homework.'}
              </p>
            </motion.div>
          )}

          {/* Transcript */}
          {transcript.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 w-full max-w-[22rem] overflow-hidden rounded-[1.5rem] bg-white/60 px-4 py-3 shadow-sm backdrop-blur-lg"
              style={{ maxHeight: '14rem', overflowY: 'auto' }}
            >
              <AnimatePresence mode="popLayout">
                {transcript.slice(-6).map((msg) => (
                  <TranscriptLine key={msg.id} role={msg.role} text={msg.text} />
                ))}
              </AnimatePresence>
              <div ref={transcriptBottomRef} />
            </motion.div>
          )}
        </div>

        {/* ── Mic button ── */}
        <div className="flex flex-col items-center pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-2">
          {!userSpeaking && aiState === 'idle' && (
            <p className="mb-4 text-[0.74rem] font-medium text-[#a09888]">
              {sessionStarted ? 'Tap to respond' : 'Tap to begin'}
            </p>
          )}
          <motion.button
            type="button"
            onTouchStart={startListening}
            onMouseDown={startListening}
            whileTap={{ scale: 0.94 }}
            className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-[0_8px_32px_-8px_rgba(60,45,25,0.28)]"
            style={{
              background: userSpeaking
                ? 'linear-gradient(135deg, #4c7fd8, #7c5cbf)'
                : 'linear-gradient(135deg, #c9a97a, #a8845a)',
            }}
          >
            {userSpeaking ? (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.4)' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            ) : null}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0" />
              <path d="M12 18v3" />
            </svg>
          </motion.button>
        </div>

        {/* ── Pronunciation tip popup ── */}
        <AnimatePresence>
          {currentTip && (
            <PronunciationTip tip={currentTip} onDismiss={() => setCurrentTip(null)} />
          )}
        </AnimatePresence>

        {/* ── Homework screen ── */}
        <AnimatePresence>
          {showHomework && (
            <HomeworkScreen lang={langCode} onClose={() => { setShowHomework(false); setSessionStarted(false); }} />
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
