import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { getPracticePhraseEntries } from '@shared/lessons'
import { buildWordArticulationGuide } from '@shared/tutor-engine'
import { AppShell } from '@/components/AppShell'
import { PronunciationDiagram } from '@/components/PronunciationDiagram'
import { VoiceWave } from '@/components/VoiceWave'
import { useActiveSession } from '@/hooks/use-active-session'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useOfflineAI } from '@/hooks/use-offline-ai'
import { useOfflinePractice } from '@/hooks/use-offline-practice'
import { blobToBase64, buildAudioSource } from '@/lib/audio'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'
import { APP_ROUTES } from '@/lib/routes'
import { buildApiUrl } from '@/lib/runtime'
import { isOfflineTtsAvailable, speakOffline } from '@/lib/speech-synthesis'

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
  hi: [
    {
      sentence: 'नमस्ते, मेरा नाम अली है।',
      phonetic: 'na-mas-tay may-raa naam a-lee hai',
      translation: 'Hello, my name is Ali.',
    },
    {
      sentence: 'शौचालय कहाँ है?',
      phonetic: 'shau-cha-lay ka-haan hai',
      translation: 'Where is the bathroom?',
    },
    {
      sentence: 'क्या आप इसे थोड़ा धीरे दोहरा सकते हैं?',
      phonetic: 'kyaa aap ise tho-daa dhee-ray do-haa-raa sak-tay hain',
      translation: 'Could you repeat that more slowly?',
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
  const response = await fetch(buildApiUrl('/api/voice-session'), {
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

async function speakLocalPhrase(text, languageCode, rate = 1) {
  if (!text || !isOfflineTtsAvailable()) return false
  speakOffline(text, languageCode, Math.max(0.72, Math.min(1.02, rate)))
  return true
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
  const offlineAi = useOfflineAI()
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
    if (!lastAudioRef.current) {
      if (practiceText.trim()) {
        setTutorState('playing')
        try {
          await speakLocalPhrase(practiceText, languageCode, rate || Number(profile.voiceSpeed || 1))
        } finally {
          setTutorState('idle')
        }
      }
      return
    }
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

    const phrasebookMatch = resolvePhrasebookMatch(text, phrasebook)
    const requestText = phrasebookMatch?.targetText || text
    const translated = Boolean(phrasebookMatch?.translated)

    if ((!offline.isOnline || !language.ttsModel) && phrasebookMatch) {
      const localPrompt = {
        sourceText: phrasebookMatch.sourceText,
        targetText: phrasebookMatch.targetText,
        translation: phrasebookMatch.translation,
        translated: true,
        phonetic: phrasebookMatch.phonetic || buildPhoneticHint(phrasebookMatch.targetText),
        coachNote: `Local voice preview is being used for ${language.label}.`,
        articulationGuide: buildPracticeGuide({
          word: null,
          phraseMeta: null,
          phrase: phrasebookMatch.targetText,
          languageCode,
        }),
      }
      setResolvedPrompt(localPrompt)
      setCoachReady(false)
      setError('')
      setTutorState('idle')
      if (autoplay) await speakLocalPhrase(localPrompt.targetText, languageCode, profile.voiceSpeed || 1)
      return localPrompt
    }

    if (!offline.isOnline) {
      setError('Connect to the internet to generate coach audio.')
      return null
    }

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
      if (phrasebookMatch) {
        const localPrompt = {
          sourceText: phrasebookMatch.sourceText,
          targetText: phrasebookMatch.targetText,
          translation: phrasebookMatch.translation,
          translated: true,
          phonetic: phrasebookMatch.phonetic || buildPhoneticHint(phrasebookMatch.targetText),
          coachNote: sayLikeLocal
            ? `This is the more natural ${language.label} phrasing for what you typed.`
            : `This is the clear textbook phrasing for what you typed.`,
          articulationGuide: buildPracticeGuide({
            word: null,
            phraseMeta: null,
            phrase: phrasebookMatch.targetText,
            languageCode,
          }),
        }
        setResolvedPrompt(localPrompt)
        setCoachReady(false)
        setTutorState('idle')
        if (autoplay) {
          await speakLocalPhrase(localPrompt.targetText, languageCode, profile.voiceSpeed || 1)
        }
        return localPrompt
      }

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

  const trainPhase = getTrainPhase({
    hasCoachAudio,
    hasAnalysis: Boolean(analysis),
    recorderStatus: recorder.status,
    tutorState,
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

  const handlePhraseInputMic = useCallback(() => {
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
  }, [inputListenState, nativeLanguage.locale])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const intent = window.sessionStorage.getItem('uselang-trainer-intent')
    if (intent !== 'voice') return
    if (currentStep || phrase.trim()) {
      window.sessionStorage.removeItem('uselang-trainer-intent')
      return
    }
    const timer = window.setTimeout(() => {
      handlePhraseInputMic()
      window.sessionStorage.removeItem('uselang-trainer-intent')
    }, 220)
    return () => window.clearTimeout(timer)
  }, [currentStep, handlePhraseInputMic, phrase])

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

  return (
    <AppShell auth={auth} route={route} section="trainer">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.35rem)]">
        <div className="flex items-center justify-between text-[0.72rem] font-medium text-ink/35">
          <span>{currentStep ? 'Active lesson' : 'Train'}</span>
          <LanguagePicker languageCode={languageCode} onChange={setLanguageCode} />
          <div className="flex items-center gap-2">
            {offlineAi.localAiAvailable ? (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium" style={{ background: 'rgba(48,209,88,0.1)', color: '#1c7c3a' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />
                Local AI
              </span>
            ) : null}
            <span>{offline.isOnline ? 'Online' : 'Offline'}</span>
          </div>
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
              : practiceTranslation || `Type in ${nativeLanguage.label}. Lane will bring it back in ${language.label}.`}
          </p>
        </div>

        <section
          className="mt-6 rounded-[1.85rem] bg-white/90 p-4"
          style={{ boxShadow: '0 18px 40px -24px rgba(15, 20, 25, 0.16)' }}
        >
          <StepRail current={trainPhase} />
          <div className="mt-4 rounded-[1.45rem] bg-[#faf7f2] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/26">
                  {currentStep ? 'Say this naturally' : 'Start in English'}
                </p>
                <p className="mt-1 text-[1.06rem] font-semibold leading-snug text-ink">
                  {currentStep
                    ? currentStep.expectedPhrase
                    : practiceText.trim() || 'Tell Lane what you want to say.'}
                </p>
                <p className="mt-1 text-[0.78rem] leading-snug text-ink/42">
                  {currentStep
                    ? currentStep.translation
                    : `Lane brings it back in ${language.label}, then you hear it, repeat it, and improve it.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePracticeTap}
                disabled={tutorState === 'thinking' || tutorState === 'loading' || (!practiceText.trim() && !currentStep)}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 ${
                  recorder.status === 'recording'
                    ? 'bg-[#1a1714] shadow-[0_18px_42px_-22px_rgba(26,23,20,0.48)]'
                    : 'bg-[#c9a97a] shadow-[0_18px_42px_-22px_rgba(201,169,122,0.48)]'
                }`}
              >
                {recorder.status === 'recording' ? <StopGlyph /> : <MicGlyph />}
              </button>
            </div>
            <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/26">
                    {recorder.status === 'recording'
                      ? 'Listening'
                      : tutorState === 'thinking'
                        ? 'Improving'
                        : tutorState === 'playing'
                          ? 'Coach playback'
                          : 'Ready'}
                  </p>
                  <p className="mt-1 text-[0.76rem] leading-snug text-ink/40">
                    {currentStep
                      ? 'Stay on the line until you sound clean, or say “next one”.'
                      : recorder.status === 'recording'
                        ? 'Speak now. Lane listens, scores, then sharpens the phrase.'
                        : 'Type it or press the mic. Hear it, try it, compare it, then save it.'}
                  </p>
                </div>
                {accuracy !== null ? (
                  <span className={`rounded-full px-3 py-1.5 text-[0.82rem] font-semibold ${accuracy >= 88 ? 'bg-mint/12 text-mint' : accuracy >= 70 ? 'bg-amber/[0.12] text-amber' : 'bg-accent/[0.1] text-accent'}`}>
                    {accuracy}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-3 h-8">
            <VoiceWave bars={recorder.bars} active={recorder.status === 'recording' || tutorState === 'playing'} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ConsoleMeta active={recorder.status === 'recording'}>Press mic to speak</ConsoleMeta>
            <ConsoleMeta active={Boolean(accuracy !== null && accuracy >= 90)}>Auto-advance at 90%+</ConsoleMeta>
            <ConsoleMeta active={Boolean(analysis?.passed)}>Say “next one” to skip</ConsoleMeta>
          </div>
        </section>

        {liveSession?.completedAt ? (
          <section
            className="mt-5 rounded-[1.7rem] bg-[#1a1714] px-4 py-4 text-white"
            style={{ boxShadow: '0 18px 42px -28px rgba(26,23,20,0.38)' }}
          >
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.05em] text-white/56">Completed</p>
            <p className="mt-1 text-[1rem] font-semibold leading-snug">You can now {liveLesson?.scenarioMeta?.completionLine?.replace(/^You can now\s*/i, '').replace(/\.$/, '') || 'use this in a real conversation'}.</p>
            <button
              type="button"
              onClick={() => activeSession.clear()}
              className="mt-3 rounded-full bg-white/12 px-3 py-1.5 text-[0.72rem] font-medium text-white/84"
            >
              Start another one
            </button>
          </section>
        ) : null}

        {currentStep ? (
          <section
            className="mt-5 rounded-[1.85rem] bg-white/90 p-5"
            style={{ boxShadow: '0 18px 40px -24px rgba(15, 20, 25, 0.16)' }}
          >
            <div className="rounded-[1.3rem] bg-ink/[0.025] px-4 py-3.5">
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
            className="mt-5 rounded-[1.7rem] bg-white/88 p-4"
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
                  Tell Lane what you want to say. It will turn that into a clean {language.label} phrase you can hear, repeat, and save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSayLikeLocal((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-[0.7rem] font-medium ${
                  sayLikeLocal ? 'bg-[#f5ede0] text-[#c9a97a]' : 'bg-ink/[0.04] text-ink/45'
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

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.04em] text-ink/28">
                Try a phrase
              </p>
              <p className="text-[0.64rem] text-ink/24">Tap once to fill the prompt</p>
            </div>

            <StarterCarousel starters={starters} onSelect={(t) => setPhrase(t)} />

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

function ComparePanel({ coachReady, userTakeReady, onPlayCoach, onPlayUser, onClose }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-4 rounded-[1.45rem] bg-white/90 p-4"
      style={{ boxShadow: '0 14px 36px -20px rgba(15, 20, 25, 0.16)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-ink/28">Compare</p>
        <button type="button" onClick={onClose} className="text-[0.72rem] font-medium text-ink/35">
          Close
        </button>
      </div>
      <p className="mt-1 text-[0.82rem] leading-snug text-ink/50">
        Play both back-to-back to hear the difference.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
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

function ConsoleMeta({ children, active = false }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-[0.68rem] font-medium ${
      active ? 'bg-[#c9a97a]/12 text-[#c9a97a]' : 'bg-ink/[0.04] text-ink/42'
    }`}>
      {children}
    </span>
  )
}

function MicGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

function StopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2.6" />
    </svg>
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

function StepRail({ current }) {
  const steps = ['listen', 'repeat', 'improve']
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const active = step === current
        const done = steps.indexOf(current) > i
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 ? <div className={`h-px w-4 ${done ? 'bg-accent' : 'bg-ink/[0.08]'}`} /> : null}
            <span className={`rounded-full px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.04em] ${
              active ? 'bg-accent/[0.1] text-accent' : done ? 'bg-accent/[0.06] text-accent/60' : 'bg-ink/[0.04] text-ink/25'
            }`}>{step}</span>
          </div>
        )
      })}
    </div>
  )
}

function StarterCarousel({ starters, onSelect }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef(null)
  const dragStartX = useRef(0)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % starters.length)
    }, 3200)
    return () => clearInterval(timerRef.current)
  }, [starters.length])

  function advance(dir) {
    clearInterval(timerRef.current)
    setIdx((i) => {
      const next = i + dir
      return next < 0 ? starters.length - 1 : next >= starters.length ? 0 : next
    })
  }

  const starter = starters[idx]

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -22 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragStart={(_, info) => { dragStartX.current = info.offset.x }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -45) advance(1)
            else if (info.offset.x > 45) advance(-1)
          }}
          className="relative cursor-pointer select-none overflow-hidden rounded-[1.3rem] bg-accent/[0.06] px-4 py-4"
          onClick={() => onSelect(starter.translation)}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full bg-accent/50" />
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-accent/55">
            Try this phrase
          </p>
          <p className="mt-2 text-[0.98rem] font-semibold leading-snug text-ink">
            {starter.translation}
          </p>
          <p className="mt-1 text-[0.8rem] font-medium text-ink/45">{starter.sentence}</p>
          <p className="mt-1.5 font-mono text-[0.7rem] text-ink/28">{starter.phonetic}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {starters.map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ width: i === idx ? '1.1rem' : '0.28rem', opacity: i === idx ? 1 : 0.25 }}
                  transition={{ duration: 0.25 }}
                  className="inline-block h-[3px] rounded-full bg-accent"
                />
              ))}
            </div>
            <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-accent">
              Use this
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next row */}
      <div className="mt-1.5 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => advance(-1)}
          className="flex items-center gap-1 text-[0.69rem] font-medium text-ink/28 transition active:text-ink/50"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <span className="text-[0.65rem] text-ink/20">{idx + 1} / {starters.length}</span>
        <button
          type="button"
          onClick={() => advance(1)}
          className="flex items-center gap-1 text-[0.69rem] font-medium text-ink/28 transition active:text-ink/50"
        >
          Next
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
