import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { getPracticePhraseEntries } from '@shared/lessons'
import { buildWordArticulationGuide } from '@shared/tutor-engine'
import { AISphere } from '@/components/AISphere'
import { AppShell } from '@/components/AppShell'
import { PronunciationDiagram } from '@/components/PronunciationDiagram'
import { VoiceWave } from '@/components/VoiceWave'
import { useActiveSession } from '@/hooks/use-active-session'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useOfflinePractice } from '@/hooks/use-offline-practice'
import { blobToBase64, buildAudioSource } from '@/lib/audio'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'
import { APP_ROUTES } from '@/lib/routes'

const STARTER_PHRASES = {
  en: [
    {
      sentence: "I'd like a table for two, please.",
      phonetic: 'id laik uh tey-buhl fer too pleez',
      translation: 'Ask for a table politely.',
    },
    {
      sentence: 'Could you repeat that more slowly?',
      phonetic: 'kud yoo ri-peat that mor sloh-lee',
      translation: 'Ask someone to slow down.',
    },
    {
      sentence: 'How do I get to the train station?',
      phonetic: 'hau doo ai get to the treyn stay-shn',
      translation: 'Ask for directions.',
    },
  ],
  es: [
    {
      sentence: 'Una mesa para dos, por favor.',
      phonetic: 'oo-nah meh-sah pah-rah dos por fah-vor',
      translation: 'A table for two, please.',
    },
    {
      sentence: '¿Puede repetirlo más despacio?',
      phonetic: 'pweh-deh reh-peh-teer-loh mahs des-pah-syoh',
      translation: 'Could you repeat that more slowly?',
    },
    {
      sentence: '¿Dónde está la estación?',
      phonetic: 'don-deh es-tah lah es-tah-syon',
      translation: 'Where is the station?',
    },
  ],
  fr: [
    {
      sentence: "Une table pour deux, s'il vous plaît.",
      phonetic: 'ewn tah-bluh poor duh seel voo pleh',
      translation: 'A table for two, please.',
    },
    {
      sentence: 'Pouvez-vous répéter plus lentement ?',
      phonetic: 'poo-vay voo ray-pay-tay plu lon-teh-mon',
      translation: 'Could you repeat more slowly?',
    },
    {
      sentence: 'Comment vais-je à la gare ?',
      phonetic: 'koh-mon vay zhah lah gahr',
      translation: 'How do I get to the station?',
    },
  ],
  zh: [
    {
      sentence: '我想要一张两人的桌子，谢谢。',
      phonetic: 'wǒ xiǎng yào yī zhāng liǎng rén de zhuōzi, xièxie',
      translation: 'A table for two, please.',
    },
    {
      sentence: '您能说慢一点再重复一遍吗？',
      phonetic: 'nín néng shuō màn yīdiǎn zài chóngfù yī biàn ma',
      translation: 'Could you repeat that more slowly?',
    },
    {
      sentence: '请问，火车站在哪里？',
      phonetic: 'qǐngwèn, huǒchē zhàn zài nǎlǐ',
      translation: 'Where is the train station?',
    },
  ],
}

function normalizeText(text = '') {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').trim()
}

function buildPhoneticHint(text = '') {
  return text
    .toLowerCase()
    .replace(/tion/g, 'shun')
    .replace(/que/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/ou/g, 'oo')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPracticeGuide({ word, phraseMeta, phrase, languageCode }) {
  const target = word?.expectedWord || phrase.trim().split(/\s+/)[0] || 'word'
  const wordGuide = buildWordArticulationGuide(target, { languageCode })
  return {
    word: target,
    phonetic: phraseMeta?.phonetic || buildPhoneticHint(target),
    tonguePosition: wordGuide.tonguePosition,
    lipShape: wordGuide.lipShape,
    airflow: wordGuide.airflow,
    slowWord: wordGuide.slowWord,
    diagramMode: wordGuide.diagramMode,
    listenFor: wordGuide.listenFor,
    commonMistake: wordGuide.commonMistake,
  }
}

function buildPhrasebook(languageCode) {
  const starterEntries = (STARTER_PHRASES[languageCode] || []).map((item) => ({
    sourceText: item.translation,
    targetText: item.sentence,
    phonetic: item.phonetic,
    translation: item.translation,
  }))

  const lessonEntries = getPracticePhraseEntries(languageCode).map((entry) => ({
    sourceText: entry.sourceText,
    targetText: entry.targetText,
    phonetic: buildPhoneticHint(entry.targetText),
    translation: entry.translation,
  }))

  const deduped = new Map()
  ;[...starterEntries, ...lessonEntries].forEach((entry) => {
    const key = `${normalizeText(entry.sourceText)}::${normalizeText(entry.targetText)}`
    if (!deduped.has(key)) deduped.set(key, entry)
  })

  return [...deduped.values()]
}

function phraseMatchScore(input, candidate) {
  const normalizedInput = normalizeText(input)
  const normalizedCandidate = normalizeText(candidate)
  if (!normalizedInput || !normalizedCandidate) return 0
  if (normalizedInput === normalizedCandidate) return 1
  if (normalizedInput.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedInput)) return 0.92

  const inputWords = normalizedInput.split(/\s+/)
  const candidateWords = normalizedCandidate.split(/\s+/)
  const shared = inputWords.filter((word) => candidateWords.includes(word)).length
  return shared / Math.max(inputWords.length, candidateWords.length)
}

function resolvePhrasebookMatch(text, entries) {
  const normalized = normalizeText(text)
  if (!normalized) return null

  const exactTarget = entries.find((entry) => normalizeText(entry.targetText) === normalized)
  if (exactTarget) {
    return { ...exactTarget, translated: false }
  }

  const exactSource = entries.find((entry) => normalizeText(entry.sourceText) === normalized)
  if (exactSource) {
    return { ...exactSource, translated: true }
  }

  let best = null
  let bestScore = 0
  for (const entry of entries) {
    const score = phraseMatchScore(text, entry.sourceText)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  if (best && bestScore >= 0.72) {
    return { ...best, translated: true }
  }

  return null
}

async function postTrainer(body, idToken) {
  const response = await fetch('/.netlify/functions/voice-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const raw = await response.text()
  let payload = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { error: raw || 'Trainer request failed.' }
  }
  if (!response.ok) throw new Error(payload.error || 'Trainer request failed')
  return payload
}

function getPracticeCaption({ phrase, tutorState, recorderStatus, isOnline }) {
  if (!phrase.trim()) return 'Type or dictate a phrase first'
  if (!isOnline) return 'Offline replay works. New feedback needs internet.'
  if (recorderStatus === 'recording') return 'Press again to stop recording'
  if (tutorState === 'thinking') return 'Listening to your take...'
  if (tutorState === 'loading') return 'Preparing coach audio...'
  if (tutorState === 'playing') return 'Coach audio is playing'
  return 'Press the mic to practice'
}

function getActivityLevel(bars = []) {
  if (!bars.length) return 0.15
  const total = bars.reduce((sum, value) => sum + Number(value || 0), 0)
  return Math.max(0.14, Math.min(1, total / bars.length))
}

function getTrainPhase({ hasCoachAudio, hasAnalysis, recorderStatus, tutorState }) {
  if (recorderStatus === 'recording') return 'repeat'
  if (tutorState === 'thinking' || hasAnalysis) return 'improve'
  if (hasCoachAudio) return 'repeat'
  return 'listen'
}

export function TrainerPage({ auth, route }) {
  const profile = auth.profile ?? {
    languageLearning: 'en',
    nativeLanguage: 'en',
    voiceSpeed: 1,
    correctionIntensity: 'balanced',
  }
  const [languageCode, setLanguageCode] = useState(() => profile.languageLearning || 'en')
  const [phrase, setPhrase] = useState('')
  const [resolvedPrompt, setResolvedPrompt] = useState(null)
  const [loadingPhrase, setLoadingPhrase] = useState(false)
  const [error, setError] = useState('')
  const [tutorState, setTutorState] = useState('idle')
  const [analysis, setAnalysis] = useState(null)
  const [downloadState, setDownloadState] = useState('idle')
  const [playingId, setPlayingId] = useState(null)
  const [selectedWord, setSelectedWord] = useState(null)
  const [wordPreviewState, setWordPreviewState] = useState('idle')
  const [inputListenState, setInputListenState] = useState('idle')
  const [coachReady, setCoachReady] = useState(false)
  const [userTakeReady, setUserTakeReady] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [sayLikeLocal, setSayLikeLocal] = useState(profile.sayLikeLocal ?? true)
  const audioRef = useRef(null)
  const userAudioRef = useRef(null)
  const savedAudioRef = useRef(null)
  const savedUrlRef = useRef(null)
  const inputRecognitionRef = useRef(null)
  const lastAudioRef = useRef(null)
  const lastUserRecordingRef = useRef(null)
  const activeSession = useActiveSession()

  const offline = useOfflinePractice({ idToken: auth.session?.idToken })
  const phrasebook = useMemo(() => buildPhrasebook(languageCode), [languageCode])
  const language = useMemo(
    () => SUPPORTED_LANGUAGES.find((entry) => entry.code === languageCode) || SUPPORTED_LANGUAGES[0],
    [languageCode],
  )
  const nativeLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find((entry) => entry.code === profile.nativeLanguage) || SUPPORTED_LANGUAGES[0],
    [profile.nativeLanguage],
  )
  const starters = STARTER_PHRASES[languageCode] || STARTER_PHRASES.en
  const liveSession = activeSession.session?.lesson ? activeSession.session : null
  const liveLesson = liveSession?.lesson || null
  const liveStepIndex = liveSession?.stepIndex || 0
  const liveTurn = liveSession?.turn || null
  const currentStep = liveLesson?.steps?.[liveStepIndex] || null

  const phraseMeta = useMemo(() => {
    return starters.find((item) => normalizeText(item.sentence) === normalizeText(phrase)) || null
  }, [phrase, starters])

  const practiceText = currentStep?.expectedPhrase || resolvedPrompt?.targetText || phrase.trim()
  const practiceTranslation = currentStep?.translation || resolvedPrompt?.translation || phraseMeta?.translation || ''
  const practicePhonetic = resolvedPrompt?.phonetic || phraseMeta?.phonetic || buildPhoneticHint(practiceText)

  const phraseWords = useMemo(() => {
    const analysisMap = new Map(
      (analysis?.wordFeedback || []).map((item) => [normalizeText(item.expectedWord), item]),
    )

    return practiceText
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => analysisMap.get(normalizeText(word)) || { expectedWord: word, status: 'correct' })
  }, [analysis, practiceText])

  const savedItems = useMemo(() => {
    const sameLanguage = offline.items.filter((item) => item.language === language.label)
    return (sameLanguage.length ? sameLanguage : offline.items).slice(0, 3)
  }, [language.label, offline.items])

  const activeGuide = useMemo(
    () =>
      selectedWord
        ? buildPracticeGuide({
            word: selectedWord,
            phraseMeta,
            phrase: practiceText,
            languageCode,
          })
        : currentStep
          ? buildPracticeGuide({
              word: liveTurn?.visualGuide?.word
                ? { expectedWord: liveTurn.visualGuide.word, status: 'close' }
                : null,
              phraseMeta,
              phrase: practiceText,
              languageCode,
            })
          : resolvedPrompt?.articulationGuide || buildPracticeGuide({
              word: null,
              phraseMeta,
              phrase: practiceText,
              languageCode,
            }),
    [currentStep, languageCode, liveTurn?.visualGuide?.word, phraseMeta, practiceText, resolvedPrompt?.articulationGuide, selectedWord],
  )
  const hasCoachAudio = Boolean(lastAudioRef.current || liveTurn?.audioBase64)
  const trainPhase = getTrainPhase({
    hasCoachAudio,
    hasAnalysis: Boolean(analysis),
    recorderStatus: recorder.status,
    tutorState,
  })

  useEffect(() => {
    if (profile.languageLearning) {
      setLanguageCode(profile.languageLearning)
    }
  }, [profile.languageLearning])

  useEffect(() => {
    if (liveTurn?.audioBase64) {
      lastAudioRef.current = {
        audioBase64: liveTurn.audioBase64,
        audioMimeType: liveTurn.audioMimeType,
        guideAudioBase64: liveTurn.guideAudioBase64 || '',
        guideAudioMimeType: liveTurn.guideAudioMimeType || '',
      }
      setCoachReady(true)
    }
  }, [liveTurn?.audioBase64, liveTurn?.audioMimeType, liveTurn?.guideAudioBase64, liveTurn?.guideAudioMimeType])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      userAudioRef.current?.pause()
      savedAudioRef.current?.pause()
      inputRecognitionRef.current?.stop?.()
      revokeObjectUrl(savedUrlRef.current)
    }
  }, [])

  useEffect(() => {
    setAnalysis(null)
    setSelectedWord(null)
    setShowGuide(false)
    setError('')
    setCoachReady(false)
    setUserTakeReady(false)
    setDownloadState('idle')
    lastAudioRef.current = null
    lastUserRecordingRef.current = null
    setResolvedPrompt(null)
  }, [phrase, languageCode])

  async function playClip(source, rate) {
    if (!source?.audioBase64) return
    const src = buildAudioSource(source.audioBase64, source.audioMimeType)
    const audio = new Audio(src)
    audio.playbackRate = rate || Number(profile.voiceSpeed || 1)
    audioRef.current = audio
    await audio.play()
    await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }))
  }

  async function playCoachAudio(rate, options = {}) {
    if (!lastAudioRef.current) return
    audioRef.current?.pause()
    setTutorState('playing')
    try {
      const includeGuide = options.includeGuide ?? !rate
      if (includeGuide && lastAudioRef.current.guideAudioBase64) {
        await playClip(
          {
            audioBase64: lastAudioRef.current.guideAudioBase64,
            audioMimeType: lastAudioRef.current.guideAudioMimeType,
          },
          1,
        )
      }
      await playClip(
        {
          audioBase64: lastAudioRef.current.audioBase64,
          audioMimeType: lastAudioRef.current.audioMimeType,
        },
        rate || Number(profile.voiceSpeed || 1),
      )
    } finally {
      setTutorState('idle')
    }
  }

  async function playUserAudio(rate) {
    if (!lastUserRecordingRef.current?.blob) return
    userAudioRef.current?.pause()
    const url = createObjectUrl(lastUserRecordingRef.current.blob)
    if (!url) return
    const audio = new Audio(url)
    audio.playbackRate = rate || 1
    userAudioRef.current = audio
    setTutorState('playing')
    await audio.play()
    await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }))
    revokeObjectUrl(url)
    setTutorState('idle')
  }

  async function playPayloadAudio(payload, rate) {
    if (!payload?.audioBase64) return
    lastAudioRef.current = {
      audioBase64: payload.audioBase64,
      audioMimeType: payload.audioMimeType,
      guideAudioBase64: payload.guideAudioBase64 || '',
      guideAudioMimeType: payload.guideAudioMimeType || '',
    }
    setCoachReady(true)
    await playCoachAudio(rate, { includeGuide: !rate })
  }

  async function fetchLivePrompt(stepIndex = liveStepIndex, { autoplay = true } = {}) {
    if (!liveLesson) return null
    setError('')
    setTutorState('loading')

    try {
      const session = await auth.getValidSession()
      const result = await postTrainer(
        {
          mode: 'prompt',
          lesson: {
            languageLearning: languageCode,
            goal: profile.goal,
            correctionIntensity: profile.correctionIntensity,
            stepIndex,
            customLesson: liveLesson,
          },
        },
        session.idToken,
      )

      activeSession.update({
        turn: result,
        stepIndex,
        updatedAt: new Date().toISOString(),
      })
      if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
      if (autoplay) {
        await playPayloadAudio(result)
      } else {
        lastAudioRef.current = {
          audioBase64: result.audioBase64,
          audioMimeType: result.audioMimeType,
          guideAudioBase64: result.guideAudioBase64 || '',
          guideAudioMimeType: result.guideAudioMimeType || '',
        }
        setCoachReady(true)
        setTutorState('idle')
      }
      return result
    } catch (requestError) {
      setTutorState('idle')
      setError(requestError.message)
      return null
    }
  }

  async function fetchTtsForPhrase(text = phrase.trim(), { autoplay = true } = {}) {
    if (!text) {
      setError('Type a phrase first.')
      return null
    }
    if (!offline.isOnline) {
      setError('Connect to the internet to generate coach audio.')
      return null
    }

    const phrasebookMatch = resolvePhrasebookMatch(text, phrasebook)
    const requestText = phrasebookMatch?.targetText || text
    const translated = Boolean(phrasebookMatch?.translated)

    setError('')
    setTutorState('loading')
    setLoadingPhrase(true)

    try {
      const session = await auth.getValidSession()
      const result = await postTrainer(
        {
          mode: 'freeform-prompt',
          text: requestText,
          languageCode,
          sourceLanguageCode: phrasebookMatch ? languageCode : profile.nativeLanguage || 'en',
          translationHint: phrasebookMatch?.translation || '',
          sayLikeLocal,
        },
        session.idToken,
      )
      setResolvedPrompt({
        sourceText: phrasebookMatch?.sourceText || result.sourceText || text,
        targetText: phrasebookMatch?.targetText || result.targetText || result.text,
        translation: phrasebookMatch?.translation || result.englishMeaning || result.translation || '',
        translated: translated || Boolean(result.translated),
        phonetic:
          phrasebookMatch?.phonetic ||
          result.phonetic ||
          phraseMeta?.phonetic ||
          buildPhoneticHint(result.targetText || result.text),
        coachNote: result.coachNote || '',
        articulationGuide: result.articulationGuide || null,
      })
      lastAudioRef.current = {
        audioBase64: result.audioBase64,
        audioMimeType: result.audioMimeType,
        guideAudioBase64: result.guideAudioBase64 || '',
        guideAudioMimeType: result.guideAudioMimeType || '',
      }
      setCoachReady(true)
      if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
      if (autoplay) {
        await playCoachAudio()
      } else {
        setTutorState('idle')
      }
      return result
    } catch (requestError) {
      setError(requestError.message)
      setTutorState('idle')
      return null
    } finally {
      setLoadingPhrase(false)
    }
  }

  async function previewWord(word) {
    const target = word?.expectedWord || word
    if (!target) return
    if (!offline.isOnline) {
      setShowGuide(true)
      setSelectedWord(typeof word === 'string' ? { expectedWord: word, status: 'correct' } : word)
      return
    }

    setSelectedWord(typeof word === 'string' ? { expectedWord: word, status: 'correct' } : word)
    setShowGuide(true)
    setWordPreviewState('loading')

    try {
      const session = await auth.getValidSession()
      const result = await postTrainer(
        { mode: 'freeform-prompt', text: target, languageCode },
        session.idToken,
      )
      const src = buildAudioSource(result.audioBase64, result.audioMimeType)
      const audio = new Audio(src)
      audio.playbackRate = 0.85
      await audio.play()
      await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWordPreviewState('idle')
    }
  }

  const recorder = useAudioRecorder({
    async onRecordingComplete({ blob, durationMs, mimeType }) {
      setTutorState('thinking')
      setError('')

      try {
        lastUserRecordingRef.current = { blob, mimeType }
        setUserTakeReady(true)
        const audioBase64 = await blobToBase64(blob)
        const session = await auth.getValidSession()
        const result = await postTrainer(
          currentStep
            ? {
                mode: 'conversation',
                audioBase64,
                mimeType,
                durationMs,
                lesson: {
                  languageLearning: languageCode,
                  goal: profile.goal,
                  correctionIntensity: profile.correctionIntensity,
                  stepIndex: liveStepIndex,
                  expectedPhrase: currentStep.expectedPhrase,
                  customLesson: liveLesson,
                },
              }
            : {
                mode: 'freeform-eval',
                text: phrase.trim(),
                expectedPhrase: practiceText,
                audioBase64,
                mimeType,
                durationMs,
                languageCode,
                correctionIntensity: profile.correctionIntensity,
              },
          session.idToken,
        )

        if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
        setAnalysis(result)
        const focusWord =
          result.visualGuide?.word
            ? { expectedWord: result.visualGuide.word, status: 'close' }
            :
          result.wordFeedback?.find((item) => item.status !== 'correct') ||
          result.wordFeedback?.[0] ||
          null
        setSelectedWord(focusWord)
        setShowGuide(Boolean(focusWord))
        setShowCompare(true)
        if (currentStep) {
          const completed =
            result.nextStepIndex === 0 &&
            liveStepIndex === liveLesson.steps.length - 1 &&
            result.passed
          activeSession.update({
            stepIndex: result.nextStepIndex,
            turn: result,
            updatedAt: new Date().toISOString(),
            completedAt: completed ? new Date().toISOString() : liveSession?.completedAt || '',
          })
          await playPayloadAudio(result)
          return
        }
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setTutorState('idle')
      }
    },
  })

  async function handlePracticeTap() {
    if (!practiceText.trim()) {
      setError(currentStep ? 'Tap Hear first, then repeat the line.' : 'Type a phrase first.')
      return
    }
    if (!offline.isOnline) {
      setError('New feedback needs internet. Saved items still replay offline.')
      return
    }
    if (recorder.status === 'recording') {
      await recorder.stopRecording()
      return
    }

    if (!currentStep && (!resolvedPrompt || resolvedPrompt.sourceText !== phrase.trim())) {
      const result = await fetchTtsForPhrase(phrase.trim(), { autoplay: false })
      if (!result) return
    }

    try {
      setError('')
      setTutorState('idle')
      await recorder.startRecording()
    } catch (recordingError) {
      setError(recordingError.message)
    }
  }

  function handlePhraseInputMic() {
    const Recognition =
      typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setError('Voice dictation is not available here.')
      return
    }

    if (inputListenState === 'listening' && inputRecognitionRef.current) {
      inputRecognitionRef.current.stop()
      setInputListenState('idle')
      return
    }

    const recognition = new Recognition()
    recognition.lang = nativeLanguage.locale || 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setInputListenState('listening')
    recognition.onend = () => setInputListenState('idle')
    recognition.onerror = () => {
      setInputListenState('idle')
      setError('Could not capture dictation.')
    }
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (transcript) setPhrase(transcript)
    }

    inputRecognitionRef.current = recognition
    recognition.start()
  }

  async function handleDownload() {
    if (!practiceText.trim()) {
      setError(currentStep ? 'Coach audio is not ready yet.' : 'Type a phrase first.')
      return
    }

    setError('')

    if (!lastAudioRef.current) {
      if (currentStep) {
        const result = await fetchLivePrompt(liveStepIndex, { autoplay: false })
        if (!result) return
      } else {
        const result = await fetchTtsForPhrase(phrase.trim(), { autoplay: false })
        if (!result) return
      }
    }

    if (!lastAudioRef.current) {
      setError('Coach audio is unavailable.')
      return
    }

    setDownloadState('saving')

    try {
      const id = `studio-${languageCode}-${Date.now()}`
      await offline.savePractice({
        id,
        sentence: practiceText,
        phonetic: practicePhonetic,
        translation: practiceTranslation,
        language: language.label,
        scenarioLabel: liveLesson?.scenarioMeta?.title || 'Train',
        audioBase64: lastAudioRef.current.audioBase64,
        audioMimeType: lastAudioRef.current.audioMimeType,
        userAudioBlob: lastUserRecordingRef.current?.blob || null,
        userAudioMimeType: lastUserRecordingRef.current?.mimeType || '',
      })
      setDownloadState('saved')
      window.setTimeout(() => setDownloadState('idle'), 2200)
    } catch (downloadError) {
      setError(downloadError.message)
      setDownloadState('idle')
    }
  }

  async function playSaved(item, source = 'coach', rate = 1) {
    savedAudioRef.current?.pause()
    revokeObjectUrl(savedUrlRef.current)
    const blob = source === 'user' ? item.userAudioBlob : item.audioBlob
    const url = createObjectUrl(blob)
    if (!url) return
    savedUrlRef.current = url
    const audio = new Audio(url)
    audio.playbackRate = rate
    savedAudioRef.current = audio
    setPlayingId(`${item.id}-${source}`)
    await audio.play()
    audio.addEventListener(
      'ended',
      () => {
        setPlayingId(null)
        revokeObjectUrl(savedUrlRef.current)
        savedUrlRef.current = null
      },
      { once: true },
    )
  }

  const accuracy = typeof analysis?.accuracy === 'number' ? Math.round(analysis.accuracy * 100) : null
  const orbTone =
    accuracy === null
      ? 'accent'
      : accuracy >= 90
        ? 'mint'
        : accuracy >= 72
          ? 'accent'
          : 'amber'
  const orbState =
    recorder.status === 'recording'
      ? 'listening'
      : tutorState === 'thinking' || tutorState === 'loading'
        ? 'thinking'
        : tutorState === 'playing'
          ? 'speaking'
          : 'idle'

  return (
    <AppShell auth={auth} route={route} section="trainer">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+3.45rem)]">
        <div className="flex items-center justify-between text-[0.72rem] font-medium text-ink/35">
          <span>{currentStep ? 'Active lesson' : 'Train'}</span>
          <LanguagePicker languageCode={languageCode} onChange={setLanguageCode} />
          <span>{offline.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="text-center">
          <p className="text-[0.74rem] font-medium uppercase tracking-[0.05em] text-accent/55">
            {currentStep ? 'Train' : 'Quick phrase studio'}
          </p>
          <h1 className="mx-auto mt-2 max-w-[16rem] text-[1.66rem] font-bold leading-tight tracking-[-0.04em] text-ink">
            {currentStep ? liveLesson.scenarioMeta.title : practiceText || 'Type a phrase to start'}
          </h1>
          <p className="mx-auto mt-2 max-w-[16.5rem] text-[0.84rem] leading-snug text-ink/38">
            {currentStep
              ? currentStep.scenario
              : practiceTranslation || `Type in ${nativeLanguage.label}. UseLang will bring it back in ${language.label}.`}
          </p>
        </div>

        {currentStep ? (
          <section
            className="mt-6 rounded-[1.85rem] bg-white/90 p-5"
            style={{ boxShadow: '0 18px 40px -24px rgba(15, 20, 25, 0.16)' }}
          >
            <StepRail current={trainPhase} />

            <div className="mt-5 rounded-[1.3rem] bg-ink/[0.025] px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/26">
                    Say this
                  </p>
                  <p className="mt-1 text-[0.98rem] font-semibold leading-snug text-ink">{currentStep.expectedPhrase}</p>
                  <p className="mt-1 text-[0.78rem] text-ink/38">{currentStep.translation}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-[0.72rem] font-medium text-ink/42">
                  {liveStepIndex + 1}/{liveLesson.steps.length}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <AISphere
                state={orbState}
                activityLevel={getActivityLevel(recorder.bars)}
                onTap={handlePracticeTap}
                disabled={tutorState === 'thinking' || tutorState === 'loading'}
                size={188}
                tone={orbTone}
                label={recorder.status === 'recording' ? 'Repeat now' : tutorState === 'thinking' ? 'Improving...' : 'Tap to speak'}
              />
              <div className="mt-2 h-8">
                <VoiceWave bars={recorder.bars} active={recorder.status === 'recording' || tutorState === 'playing'} />
              </div>
            </div>

            <div className="mt-5 rounded-[1.15rem] bg-accent/[0.05] px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-accent/60">
                Coach tip
              </p>
              <p className="mt-1 text-[0.86rem] leading-snug text-ink/58">
                {analysis?.comparisonNotes || currentStep.coachTip}
              </p>
            </div>
          </section>
        ) : (
          <section
            className="mt-6 rounded-[1.7rem] bg-white/88 p-4"
            style={{ boxShadow: '0 12px 36px -20px rgba(15, 20, 25, 0.14)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                  Setup
                </p>
                <p className="mt-1 text-[0.92rem] font-semibold text-ink">
                  Start in {nativeLanguage.label}
                </p>
                <p className="mt-1 max-w-[14rem] text-[0.76rem] leading-snug text-ink/38">
                  Tell UseLang what you want to say. It will turn that into a clean {language.label} phrase you can hear, repeat, and save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSayLikeLocal((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-[0.7rem] font-medium ${
                  sayLikeLocal ? 'bg-accent/[0.08] text-accent' : 'bg-ink/[0.04] text-ink/45'
                }`}
              >
                {sayLikeLocal ? 'Say it like a native' : 'Textbook'}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <textarea
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                rows={2}
                placeholder={`Type in ${nativeLanguage.label} and get it in ${language.label}`}
                className="min-h-[3.7rem] flex-1 rounded-[1.15rem] bg-ink/[0.035] px-3.5 py-3 text-[0.92rem] font-medium leading-snug text-ink placeholder:text-ink/24"
              />
              <button
                type="button"
                onClick={handlePhraseInputMic}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
                  inputListenState === 'listening' ? 'bg-accent text-white' : 'bg-ink/[0.045] text-ink/45'
                }`}
              >
                <MicGlyph />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                Examples
              </p>
            </div>

            <div className="mt-3 grid gap-2.5">
              {starters.map((starter) => (
                <button
                  key={starter.sentence}
                  type="button"
                  onClick={() => setPhrase(starter.translation)}
                  className="relative overflow-hidden flex items-center justify-between rounded-[1.1rem] bg-ink/[0.03] px-3.5 py-3 text-left transition active:scale-[0.99]"
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent/70" />
                  <div className="min-w-0 flex-1">
                    <p className="pl-1.5 text-[0.8rem] font-semibold text-ink">{starter.translation}</p>
                    <p className="mt-0.5 pl-1.5 text-[0.7rem] text-ink/36">{starter.sentence}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-medium text-accent">
                    Use
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-[1.35rem] bg-accent/[0.05] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-accent/60">
                    Practice
                  </p>
                  <p className="mt-1 text-[0.84rem] leading-snug text-ink/58">
                    {getPracticeCaption({
                      phrase: practiceText,
                      tutorState,
                      recorderStatus: recorder.status,
                      isOnline: offline.isOnline,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePracticeTap}
                  disabled={!practiceText.trim() || tutorState === 'thinking' || tutorState === 'loading'}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                    recorder.status === 'recording'
                      ? 'bg-accent text-white shadow-[0_14px_30px_-16px_rgba(0,122,255,0.6)]'
                      : 'bg-white text-accent'
                  } disabled:opacity-35`}
                  style={{ boxShadow: recorder.status === 'recording' ? undefined : '0 12px 26px -18px rgba(15, 20, 25, 0.18)' }}
                >
                  <MicGlyph />
                </button>
              </div>

              <div className="mt-4 rounded-[1rem] bg-white/88 px-4 py-3">
                <VoiceWave bars={recorder.bars} active={recorder.status === 'recording' || tutorState === 'playing'} />
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => (currentStep ? fetchLivePrompt(liveStepIndex) : fetchTtsForPhrase())}
            disabled={currentStep ? tutorState === 'thinking' || tutorState === 'loading' : !phrase.trim() || loadingPhrase || !offline.isOnline}
            className="btn-primary !py-3 !text-[0.8rem]"
          >
            {loadingPhrase ? 'Loading...' : currentStep ? 'Hear coach' : 'Hear it'}
          </button>
          <button
            type="button"
            onClick={() => playCoachAudio(0.82)}
            disabled={!coachReady}
            className="btn-ghost !py-3 !text-[0.8rem] disabled:opacity-35"
          >
            Slow
          </button>
          <button
            type="button"
            onClick={() => setShowCompare((current) => !current)}
            disabled={!coachReady || !userTakeReady}
            className="btn-ghost !py-3 !text-[0.8rem] disabled:opacity-35"
          >
            Compare
          </button>
        </div>

        {phrase.trim() ? (
          <SentenceSheet
            phrase={practiceText}
            sourceText={resolvedPrompt?.sourceText || ''}
            translated={Boolean(resolvedPrompt?.translated)}
            phonetic={practicePhonetic}
            translation={practiceTranslation}
            phraseWords={phraseWords}
            selectedWord={selectedWord}
            accuracy={accuracy}
            onSelectWord={previewWord}
            coachNote={resolvedPrompt?.coachNote || ''}
          />
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === 'saving' || !practiceText.trim()}
            className={`rounded-[1rem] px-3 py-3 text-[0.8rem] font-medium transition ${
              downloadState === 'saved' ? 'bg-mint/12 text-mint' : 'bg-ink/[0.045] text-ink/55'
            }`}
          >
            {downloadState === 'saving' ? 'Saving...' : downloadState === 'saved' ? 'Saved for offline use' : 'Download'}
          </button>
          {currentStep ? (
            <button
              type="button"
              onClick={() => {
                activeSession.clear()
                setAnalysis(null)
                setSelectedWord(null)
                setShowGuide(false)
              }}
              className="btn-ghost !py-3 !text-[0.8rem]"
            >
              Open phrase studio
            </button>
          ) : (
            <button
              type="button"
              onClick={() => route.navigate(APP_ROUTES.home)}
              className="btn-ghost !py-3 !text-[0.8rem]"
            >
              Build a plan
            </button>
          )}
        </div>

        <AnimatePresence>
          {showCompare && (coachReady || userTakeReady) ? (
            <ComparePanel
              coachReady={coachReady}
              userTakeReady={userTakeReady}
              onPlayCoach={() => playCoachAudio()}
              onPlayUser={() => playUserAudio()}
              onClose={() => setShowCompare(false)}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showGuide && selectedWord ? (
            <ArticulationCard
              guide={activeGuide}
              wordPreviewState={wordPreviewState}
              onReplayWord={() => previewWord(selectedWord)}
              onReplaySlow={() => playCoachAudio(0.82)}
              onClose={() => setShowGuide(false)}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {analysis ? (
            <FeedbackCard
              analysis={analysis}
              coachReady={coachReady}
              userTakeReady={userTakeReady}
              selectedWord={selectedWord}
              onSelectWord={previewWord}
              onPlayCoach={() => playCoachAudio()}
              onPlayUser={() => playUserAudio()}
            />
          ) : null}
        </AnimatePresence>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-[1.15rem] bg-danger/8 px-4 py-3 text-[0.82rem] text-danger"
          >
            {error}
          </motion.div>
        ) : null}

        <section className="mt-7 rounded-[1.45rem] bg-white/84 px-4 py-4" style={{ boxShadow: '0 10px 28px -18px rgba(15, 20, 25, 0.14)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                Library
              </p>
              <p className="mt-1 text-[0.9rem] font-semibold text-ink">
                {savedItems.length ? `${savedItems.length} saved phrase${savedItems.length > 1 ? 's' : ''}` : 'Nothing saved yet'}
              </p>
              <p className="mt-1 text-[0.78rem] leading-snug text-ink/42">
                Replay coach audio and your own take offline from Library.
              </p>
            </div>
            <button
              type="button"
              onClick={() => route.navigate(APP_ROUTES.downloads)}
              className="rounded-full bg-ink/[0.04] px-3 py-1.5 text-[0.72rem] font-medium text-ink/48"
            >
              Open
            </button>
          </div>

          {savedItems.length ? (
            <div className="mt-4 space-y-2.5">
              {savedItems.map((item) => (
                <SavedPreviewRow
                  key={item.id}
                  item={item}
                  playingId={playingId}
                  onPlay={playSaved}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.1rem] bg-ink/[0.03] px-3.5 py-3">
              <p className="text-[0.8rem] font-medium text-ink/48">
                Save a phrase here and it will appear in Library for offline replay.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function SentenceSheet({
  phrase,
  sourceText,
  translated,
  phonetic,
  translation,
  phraseWords,
  selectedWord,
  accuracy,
  onSelectWord,
  coachNote,
}) {
  return (
    <section
      className="mt-6 rounded-[1.55rem] bg-white/84 p-4"
      style={{ boxShadow: '0 12px 34px -20px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
            {translated ? 'You will say' : 'Practice phrase'}
          </p>
          <p className="mt-1 text-[1rem] font-semibold leading-snug text-ink">{phrase.trim()}</p>
          <p className="mt-1 font-serif text-[0.82rem] text-ink/33">/{phonetic.trim()}/</p>
          {translation ? (
            <div className="mt-2 rounded-[0.95rem] bg-ink/[0.03] px-3 py-2.5">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.04em] text-ink/25">
                English meaning
              </p>
              <p className="mt-1 text-[0.78rem] leading-snug text-ink/50">{translation}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-[0.8rem] leading-snug text-ink/42">
              Use this as a quick phrase you can replay later.
            </p>
          )}
          {translated && sourceText ? (
            <p className="mt-1.5 text-[0.72rem] leading-snug text-accent/60">
              You asked: {sourceText}
            </p>
          ) : null}
          {coachNote ? (
            <p className="mt-1.5 text-[0.72rem] leading-snug text-ink/36">
              {coachNote}
            </p>
          ) : null}
        </div>
        {accuracy !== null ? (
          <span
            className={`text-[1.5rem] font-bold leading-none ${
              accuracy >= 88 ? 'text-mint' : accuracy >= 70 ? 'text-amber' : 'text-accent'
            }`}
          >
            {accuracy}%
          </span>
        ) : null}
      </div>

      {phraseWords.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {phraseWords.map((word, index) => {
            const isActive =
              normalizeText(selectedWord?.expectedWord) === normalizeText(word.expectedWord)
            const tone =
              isActive
                ? 'bg-accent/10 text-accent'
                : word.status === 'incorrect'
                  ? 'bg-danger/8 text-danger'
                  : word.status === 'close'
                    ? 'bg-amber/[0.12] text-amber'
                    : 'bg-ink/[0.04] text-ink/62'

            return (
              <button
                key={`${word.expectedWord}-${index}`}
                type="button"
                onClick={() => onSelectWord(word)}
                className={`rounded-full px-3 py-1.5 text-[0.74rem] font-medium transition active:scale-[0.98] ${tone}`}
              >
                {word.expectedWord}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function ArticulationCard({ guide, wordPreviewState, onReplayWord, onReplaySlow, onClose }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22 }}
      className="mt-5 rounded-[1.55rem] bg-white/88 p-4"
      style={{ boxShadow: '0 14px 36px -18px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
            How to say it
          </p>
          <h3 className="mt-1 text-[1.08rem] font-semibold text-ink">{guide.word}</h3>
          <p className="mt-0.5 font-serif text-[0.82rem] text-ink/34">/{guide.phonetic}/</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.04] text-ink/34"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="shrink-0">
          <PronunciationDiagram guide={guide} size={122} compact />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <GuideRow label="Tongue placement" value={guide.tonguePosition} />
          <GuideRow label="Lip shape" value={guide.lipShape} />
          <GuideRow label="Air flow" value={guide.airflow} />
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <GuideRow label="Listen for" value={guide.listenFor || 'A cleaner vowel and a softer release.'} />
        <GuideRow label="Avoid" value={guide.commonMistake || 'Do not turn it back into an English mouth shape.'} />
        <GuideRow label="Drill" value={guide.slowWord} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onReplayWord} className="btn-ghost !py-2.5 !text-[0.78rem]">
          {wordPreviewState === 'loading' ? 'Playing...' : 'Replay'}
        </button>
        <button type="button" onClick={onReplaySlow} className="btn-ghost !py-2.5 !text-[0.78rem]">
          Slow coach
        </button>
      </div>
    </motion.section>
  )
}

function GuideRow({ label, value }) {
  return (
    <div className="rounded-[1rem] bg-ink/[0.03] px-3 py-2.5">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/25">{label}</p>
      <p className="mt-1 text-[0.78rem] leading-snug text-ink/58">{value}</p>
    </div>
  )
}

function FeedbackCard({
  analysis,
  coachReady,
  userTakeReady,
  selectedWord,
  onSelectWord,
  onPlayCoach,
  onPlayUser,
}) {
  const accuracy = typeof analysis.accuracy === 'number' ? Math.round(analysis.accuracy * 100) : null
  const focusWord =
    selectedWord ||
    analysis.wordFeedback?.find((item) => item.status !== 'correct') ||
    analysis.wordFeedback?.[0] ||
    null

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-[1.55rem] bg-white/88 p-4"
      style={{ boxShadow: '0 14px 36px -18px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
            Feedback
          </p>
          <p className="mt-1.5 max-w-[14rem] text-[0.84rem] leading-snug text-ink/58">
            {analysis.explanation || 'Compare your take to the coach version.'}
          </p>
        </div>
        {accuracy !== null ? (
          <span
            className={`text-[1.5rem] font-bold leading-none ${
              accuracy >= 88 ? 'text-mint' : accuracy >= 70 ? 'text-amber' : 'text-accent'
            }`}
          >
            {accuracy}%
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-[1rem] bg-ink/[0.03] p-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/24">You said</p>
        <p className="mt-1 text-[0.84rem] leading-snug text-ink/55">"{analysis.transcript || '-'}"</p>
      </div>

      {(analysis.wordFeedback || []).length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.wordFeedback.map((item, index) => {
            const active =
              normalizeText(focusWord?.expectedWord) === normalizeText(item.expectedWord)
            const tone =
              active
                ? 'bg-accent/10 text-accent'
                : item.status === 'incorrect'
                  ? 'bg-danger/8 text-danger'
                  : item.status === 'close'
                    ? 'bg-amber/[0.12] text-amber'
                    : 'bg-ink/[0.04] text-ink/62'

            return (
              <button
                key={`${item.expectedWord}-${index}`}
                type="button"
                onClick={() => onSelectWord(item)}
                className={`rounded-full px-3 py-1.5 text-[0.74rem] font-medium transition active:scale-[0.98] ${tone}`}
              >
                {item.expectedWord}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CompareButton label="Coach" ready={coachReady} onPlay={onPlayCoach} />
        <CompareButton label="Your take" ready={userTakeReady} onPlay={onPlayUser} />
      </div>
    </motion.section>
  )
}

function CompareButton({ label, ready, onPlay }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!ready}
      className="flex items-center justify-between rounded-[1rem] bg-ink/[0.03] px-3 py-2.5 disabled:opacity-30"
    >
      <span className="text-[0.78rem] font-medium text-ink/58">{label}</span>
      <span className={`text-[0.64rem] uppercase tracking-[0.04em] ${ready ? 'text-accent' : 'text-ink/20'}`}>
        {ready ? 'Play' : 'Empty'}
      </span>
    </button>
  )
}

function SavedPreviewRow({ item, playingId, onPlay }) {
  return (
    <div
      className="rounded-[1.35rem] bg-white/84 px-4 py-3"
      style={{ boxShadow: '0 10px 28px -18px rgba(15, 20, 25, 0.14)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
            {item.language || 'Saved'} · {item.scenarioLabel || 'Train'}
          </p>
          <p className="mt-1 text-[0.86rem] font-semibold leading-snug text-ink">{item.sentence}</p>
          {item.phonetic ? (
            <p className="mt-0.5 font-serif text-[0.76rem] text-ink/34">/{item.phonetic}/</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onPlay(item, 'coach')} className="btn-primary flex-1 !py-2.5 !text-[0.76rem]">
          {playingId === `${item.id}-coach` ? 'Playing...' : 'Coach'}
        </button>
        <button type="button" onClick={() => onPlay(item, 'coach', 0.82)} className="btn-ghost flex-1 !py-2.5 !text-[0.76rem]">
          Slow
        </button>
        {item.userAudioBlob ? (
          <button type="button" onClick={() => onPlay(item, 'user')} className="btn-ghost flex-1 !py-2.5 !text-[0.76rem]">
            {playingId === `${item.id}-user` ? 'Playing...' : 'You'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function LanguagePicker({ languageCode, onChange }) {
  const [open, setOpen] = useState(false)
  const current = SUPPORTED_LANGUAGES.find((entry) => entry.code === languageCode) || SUPPORTED_LANGUAGES[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-ink/[0.04] px-3 text-[0.74rem] font-medium text-ink/50"
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-[1.1rem] bg-white p-1"
              style={{ boxShadow: '0 14px 40px -12px rgba(15, 20, 25, 0.16)' }}
            >
              {SUPPORTED_LANGUAGES.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => {
                    onChange(entry.code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-[0.85rem] px-3 py-2 text-[0.82rem] transition ${
                    entry.code === languageCode
                      ? 'bg-accent/[0.08] font-medium text-accent'
                      : 'text-ink/58 hover:bg-ink/[0.03]'
                  }`}
                >
                  {entry.label}
                  {entry.code === languageCode ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : null}
                </button>
              ))}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MicGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  )
}
