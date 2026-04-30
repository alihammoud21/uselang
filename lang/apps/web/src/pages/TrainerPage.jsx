import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@shared/languages'
import { getPracticePhraseEntries } from '@shared/lessons'
import { buildWordArticulationGuide } from '@shared/tutor-engine'
import { AISphere } from '@/components/AISphere'
import { AppShell } from '@/components/AppShell'
import { PersistentMicButton } from '@/components/PersistentMicButton'
import { PronunciationDiagram } from '@/components/PronunciationDiagram'
import { VoiceWave } from '@/components/VoiceWave'
import { useActiveSession } from '@/hooks/use-active-session'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useOfflineAI } from '@/hooks/use-offline-ai'
import { useOfflinePractice } from '@/hooks/use-offline-practice'
import { blobToBase64, buildAudioSource } from '@/lib/audio'
import { getArticulationMedia } from '@/lib/articulation-media'
import { buildHomeworkBlock } from '@/lib/homework'
import { MIC_STATE_COPY } from '@/lib/mic-states'
import { createObjectUrl, revokeObjectUrl } from '@/lib/offline-store'
import { APP_ROUTES } from '@/lib/routes'
import { buildApiUrl } from '@/lib/runtime'
import { isOfflineTtsAvailable, speakOffline } from '@/lib/speech-synthesis'
import { postTutorSession } from '@/lib/tutor-client'

const STARTER_PHRASES = {
  en: [
    { sentence: "I'd like a table for two, please.", phonetic: 'id laik uh tey-buhl fer too pleez', translation: 'Ask for a table politely.' },
    { sentence: 'Could you repeat that more slowly?', phonetic: 'kud yoo ri-peat that mor sloh-lee', translation: 'Ask someone to slow down.' },
    { sentence: 'How do I get to the train station?', phonetic: 'hau doo ai get to the treyn stay-shn', translation: 'Ask for directions.' },
  ],
  es: [
    { sentence: 'Una mesa para dos, por favor.', phonetic: 'oo-nah meh-sah pah-rah dos por fah-vor', translation: 'A table for two, please.' },
    { sentence: '¿Puede repetirlo más despacio?', phonetic: 'pweh-deh reh-peh-teer-loh mahs des-pah-syoh', translation: 'Could you repeat that more slowly?' },
    { sentence: '¿Dónde está la estación?', phonetic: 'don-deh es-tah lah es-tah-syon', translation: 'Where is the station?' },
  ],
  fr: [
    { sentence: "Une table pour deux, s'il vous plaît.", phonetic: 'ewn tah-bluh poor duh seel voo pleh', translation: 'A table for two, please.' },
    { sentence: 'Pouvez-vous répéter plus lentement ?', phonetic: 'poo-vay voo ray-pay-tay plu lon-teh-mon', translation: 'Could you repeat more slowly?' },
    { sentence: 'Comment vais-je à la gare ?', phonetic: 'koh-mon vay zhah lah gahr', translation: 'How do I get to the station?' },
  ],
  zh: [
    { sentence: '我想要一张两人的桌子，谢谢。', phonetic: 'wǒ xiǎng yào yī zhāng liǎng rén de zhuōzi', translation: 'A table for two, please.' },
    { sentence: '您能说慢一点再重复一遍吗？', phonetic: 'nín néng shuō màn yīdiǎn zài chóngfù yī biàn ma', translation: 'Could you repeat that more slowly?' },
    { sentence: '请问，火车站在哪里？', phonetic: 'qǐngwèn, huǒchē zhàn zài nǎlǐ', translation: 'Where is the train station?' },
  ],
  de: [
    { sentence: 'Einen Tisch für zwei, bitte.', phonetic: 'ai-nen tish fuer tsvai bi-te', translation: 'A table for two, please.' },
    { sentence: 'Könnten Sie das bitte wiederholen?', phonetic: 'koen-ten zee das bi-te vee-der-hoh-len', translation: 'Could you repeat that, please?' },
    { sentence: 'Wie komme ich zum Bahnhof?', phonetic: 'vee ko-me ikh tsum bahn-hohf', translation: 'How do I get to the train station?' },
  ],
  it: [
    { sentence: 'Un tavolo per due, per favore.', phonetic: 'oon tah-voh-loh per doo-eh per fah-voh-reh', translation: 'A table for two, please.' },
    { sentence: 'Può ripetere più lentamente?', phonetic: 'pwoh ree-peh-teh-reh pyoo len-tah-men-teh', translation: 'Could you repeat more slowly?' },
    { sentence: "Dov'è la stazione?", phonetic: 'doh-veh lah stah-tsyoh-neh', translation: 'Where is the station?' },
  ],
  ja: [
    { sentence: '二人用のテーブルをお願いします。', phonetic: 'fu-ta-ri-yō no tē-bu-ru o o-ne-gai shi-ma-su', translation: 'A table for two, please.' },
    { sentence: 'もう少しゆっくり言ってもらえますか？', phonetic: 'mō su-ko-shi yuk-ku-ri it-te mo-ra-e-ma-su ka', translation: 'Could you say that more slowly?' },
    { sentence: '駅はどこですか？', phonetic: 'e-ki wa do-ko de-su ka', translation: 'Where is the station?' },
  ],
  nl: [
    { sentence: 'Een tafel voor twee, alstublieft.', phonetic: 'ayn tah-fel vohr tvay als-too-bleeft', translation: 'A table for two, please.' },
    { sentence: 'Kunt u dat herhalen, alstublieft?', phonetic: 'kunt ew dat her-hah-len als-too-bleeft', translation: 'Could you repeat that, please?' },
    { sentence: 'Hoe kom ik bij het station?', phonetic: 'hoo kom ik bay het stah-shon', translation: 'How do I get to the station?' },
  ],
  hi: [
    { sentence: 'नमस्ते, मेरा नाम अली है।', phonetic: 'na-mas-tay may-raa naam a-lee hai', translation: 'Hello, my name is Ali.' },
    { sentence: 'शौचालय कहाँ है?', phonetic: 'shau-cha-lay ka-haan hai', translation: 'Where is the bathroom?' },
    { sentence: 'क्या आप इसे थोड़ा धीरे दोहरा सकते हैं?', phonetic: 'kyaa aap ise tho-daa dhee-ray do-haa-raa sak-tay hain', translation: 'Could you repeat that more slowly?' },
  ],
}

function normalizeText(text = '') {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').trim()
}

function buildPhoneticHint(text = '') {
  return text.toLowerCase().replace(/tion/g, 'shun').replace(/que/g, 'k').replace(/ph/g, 'f').replace(/ou/g, 'oo').replace(/\s+/g, ' ').trim()
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
  if (exactTarget) return { ...exactTarget, translated: false }
  const exactSource = entries.find((entry) => normalizeText(entry.sourceText) === normalized)
  if (exactSource) return { ...exactSource, translated: true }
  let best = null
  let bestScore = 0
  for (const entry of entries) {
    const score = phraseMatchScore(text, entry.sourceText)
    if (score > bestScore) { bestScore = score; best = entry }
  }
  if (best && bestScore >= 0.72) return { ...best, translated: true }
  return null
}

async function postTrainer(body, idToken) {
  const response = await fetch(buildApiUrl('/api/voice-session'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const raw = await response.text()
  let payload = {}
  try { payload = raw ? JSON.parse(raw) : {} }
  catch { payload = { error: raw || 'Trainer request failed.' } }
  if (!response.ok) throw new Error(payload.error || 'Trainer request failed')
  return payload
}

function speakLocalPhrase(text, languageCode, rate = 1) {
  if (!text || !isOfflineTtsAvailable()) return Promise.resolve(false)
  return new Promise((resolve) => {
    speakOffline(text, languageCode, Math.max(0.72, Math.min(1.02, rate)), {
      onEnd: () => resolve(true),
      onError: () => resolve(false),
    })
  })
}

function getTrainPhase({ hasCoachAudio, hasAnalysis, recorderStatus, tutorState }) {
  if (recorderStatus === 'recording') return 'repeat'
  if (tutorState === 'thinking' || hasAnalysis) return 'improve'
  if (hasCoachAudio) return 'repeat'
  return 'listen'
}

function resolvePersistentMicState({ recorderStatus, tutorState, hasResult, offline }) {
  if (recorderStatus === 'recording') return 'listening'
  if (recorderStatus === 'processing' || tutorState === 'thinking' || tutorState === 'loading') return 'processing'
  if (offline) return 'blocked'
  if (hasResult) return 'result-ready'
  return 'idle'
}

function getSphereProps(persistentMicState, tutorState) {
  if (persistentMicState === 'listening') return { state: 'listening', tone: 'accent' }
  if (persistentMicState === 'processing') return { state: 'thinking', tone: 'warm' }
  if (tutorState === 'playing' || tutorState === 'loading') return { state: 'speaking', tone: 'warm' }
  if (persistentMicState === 'result-ready') return { state: 'idle', tone: 'mint' }
  if (persistentMicState === 'blocked') return { state: 'blocked', tone: 'warm' }
  return { state: 'idle', tone: 'warm' }
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
  const [saveState, setSaveState] = useState('idle')
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

  const phraseMeta = useMemo(
    () => starters.find((item) => normalizeText(item.sentence) === normalizeText(phrase)) || null,
    [phrase, starters],
  )

  const practiceText = currentStep?.expectedPhrase || resolvedPrompt?.targetText || phrase.trim()
  const practiceTranslation = currentStep?.translation || resolvedPrompt?.translation || phraseMeta?.translation || ''
  const practicePhonetic = resolvedPrompt?.phonetic || phraseMeta?.phonetic || buildPhoneticHint(practiceText)

  const phraseWords = useMemo(() => {
    const analysisMap = new Map(
      (analysis?.wordFeedback || []).map((item) => [normalizeText(item.expectedWord), item]),
    )
    return practiceText
      .split(/\s+/).map((word) => word.trim()).filter(Boolean)
      .map((word) => analysisMap.get(normalizeText(word)) || { expectedWord: word, status: 'correct' })
  }, [analysis, practiceText])

  const savedItems = useMemo(() => {
    const sameLanguage = offline.items.filter((item) => item.language === language.label)
    return (sameLanguage.length ? sameLanguage : offline.items).slice(0, 3)
  }, [language.label, offline.items])

  const activeGuide = useMemo(
    () =>
      selectedWord
        ? buildPracticeGuide({ word: selectedWord, phraseMeta, phrase: practiceText, languageCode })
        : currentStep
          ? buildPracticeGuide({
              word: liveTurn?.visualGuide?.word ? { expectedWord: liveTurn.visualGuide.word, status: 'close' } : null,
              phraseMeta, phrase: practiceText, languageCode,
            })
          : resolvedPrompt?.articulationGuide || buildPracticeGuide({ word: null, phraseMeta, phrase: practiceText, languageCode }),
    [currentStep, languageCode, liveTurn?.visualGuide?.word, phraseMeta, practiceText, resolvedPrompt?.articulationGuide, selectedWord],
  )
  const articulationMedia = useMemo(() => getArticulationMedia(activeGuide), [activeGuide])
  const hasCoachAudio = Boolean(lastAudioRef.current || liveTurn?.audioBase64)
  const homework = useMemo(
    () => buildHomeworkBlock({
      phrase: practiceText, translation: practiceTranslation,
      focusWord: activeGuide?.word || selectedWord?.expectedWord || '',
      accuracy: analysis?.accuracy || 0,
      scenarioTitle: liveLesson?.scenarioMeta?.title || 'Quick ask',
    }),
    [activeGuide?.word, analysis?.accuracy, liveLesson?.scenarioMeta?.title, practiceText, practiceTranslation, selectedWord?.expectedWord],
  )

  useEffect(() => {
    if (profile.languageLearning) setLanguageCode(profile.languageLearning)
  }, [profile.languageLearning])

  useEffect(() => {
    if (liveTurn?.audioBase64) {
      lastAudioRef.current = {
        audioBase64: liveTurn.audioBase64, audioMimeType: liveTurn.audioMimeType,
        guideAudioBase64: liveTurn.guideAudioBase64 || '', guideAudioMimeType: liveTurn.guideAudioMimeType || '',
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
    setAnalysis(null); setSelectedWord(null); setShowGuide(false); setError('')
    setSaveState('idle'); setCoachReady(false); setUserTakeReady(false)
    setDownloadState('idle'); lastAudioRef.current = null; lastUserRecordingRef.current = null
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
        try { await speakLocalPhrase(practiceText, languageCode, rate || Number(profile.voiceSpeed || 1)) }
        finally { setTutorState('idle') }
      }
      return
    }
    audioRef.current?.pause()
    setTutorState('playing')
    try {
      const includeGuide = options.includeGuide ?? !rate
      if (includeGuide && lastAudioRef.current.guideAudioBase64) {
        await playClip({ audioBase64: lastAudioRef.current.guideAudioBase64, audioMimeType: lastAudioRef.current.guideAudioMimeType }, 1)
      }
      await playClip({ audioBase64: lastAudioRef.current.audioBase64, audioMimeType: lastAudioRef.current.audioMimeType }, rate || Number(profile.voiceSpeed || 1))
    } finally { setTutorState('idle') }
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
      audioBase64: payload.audioBase64, audioMimeType: payload.audioMimeType,
      guideAudioBase64: payload.guideAudioBase64 || '', guideAudioMimeType: payload.guideAudioMimeType || '',
    }
    setCoachReady(true)
    await playCoachAudio(rate, { includeGuide: !rate })
  }

  async function fetchLivePrompt(stepIndex = liveStepIndex, { autoplay = true } = {}) {
    if (!liveLesson) return null
    setError(''); setTutorState('loading')
    try {
      const session = await auth.getValidSession()
      const result = await postTrainer({
        mode: 'prompt',
        lesson: { languageLearning: languageCode, goal: profile.goal, correctionIntensity: profile.correctionIntensity, stepIndex, customLesson: liveLesson },
      }, session.idToken)
      activeSession.update({ turn: result, stepIndex, updatedAt: new Date().toISOString() })
      if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
      if (autoplay) { await playPayloadAudio(result) }
      else {
        lastAudioRef.current = { audioBase64: result.audioBase64, audioMimeType: result.audioMimeType, guideAudioBase64: result.guideAudioBase64 || '', guideAudioMimeType: result.guideAudioMimeType || '' }
        setCoachReady(true); setTutorState('idle')
      }
      return result
    } catch (requestError) { setTutorState('idle'); setError(requestError.message); return null }
  }

  async function fetchTtsForPhrase(text = phrase.trim(), { autoplay = true } = {}) {
    if (!text) { setError('Type a phrase first.'); return null }
    const phrasebookMatch = resolvePhrasebookMatch(text, phrasebook)
    const requestText = phrasebookMatch?.targetText || text
    const translated = Boolean(phrasebookMatch?.translated)

    if ((!offline.isOnline || !language.ttsModel) && phrasebookMatch) {
      const localPrompt = {
        sourceText: phrasebookMatch.sourceText, targetText: phrasebookMatch.targetText,
        translation: phrasebookMatch.translation, translated: true,
        phonetic: phrasebookMatch.phonetic || buildPhoneticHint(phrasebookMatch.targetText),
        coachNote: `Local voice preview for ${language.label}.`,
        articulationGuide: buildPracticeGuide({ word: null, phraseMeta: null, phrase: phrasebookMatch.targetText, languageCode }),
      }
      setResolvedPrompt(localPrompt); setCoachReady(false); setError(''); setTutorState('idle')
      if (autoplay) await speakLocalPhrase(localPrompt.targetText, languageCode, profile.voiceSpeed || 1)
      return localPrompt
    }
    setError(''); setTutorState('loading'); setLoadingPhrase(true)
    try {
      const tutor = await postTutorSession({
        mode: 'quick-ask',
        text: requestText,
        languageCode,
        nativeLanguageCode: phrasebookMatch ? languageCode : profile.nativeLanguage || 'en',
        includeAudio: false,
        sessionMemory: {
          currentPhrase: practiceText,
          weakSounds: (analysis?.wordFeedback || []).filter((item) => item.status !== 'correct').map((item) => item.expectedWord),
          understoodMeaning: Boolean(practiceTranslation),
        },
      })

      const result = {
        sourceText: phrasebookMatch?.sourceText || text,
        targetText: tutor.naturalPhrase,
        text: tutor.naturalPhrase,
        translation: tutor.context,
        englishMeaning: tutor.context,
        translated: true,
        phonetic: tutor.phonetic,
        coachNote: tutor.pronunciationTip || tutor.correctionLine || '',
        articulationGuide: tutor.articulation ? {
          word: tutor.naturalPhrase.split(/\s+/)[0] || tutor.naturalPhrase,
          phonetic: tutor.phonetic,
          tonguePosition: tutor.articulation.tonguePlacement,
          lipShape: tutor.articulation.lipShape,
          airflow: tutor.articulation.airflow,
          slowWord: tutor.articulation.stress,
          listenFor: tutor.pronunciationTip,
          commonMistake: tutor.correctionLine,
        } : null,
        audioBase64: tutor.audioBase64,
        audioMimeType: tutor.audioMimeType,
      }
      const resolved = {
        sourceText: phrasebookMatch?.sourceText || result.sourceText || text,
        targetText: phrasebookMatch?.targetText || result.targetText || result.text,
        translation: phrasebookMatch?.translation || result.englishMeaning || result.translation || '',
        translated: translated || Boolean(result.translated),
        phonetic: phrasebookMatch?.phonetic || result.phonetic || phraseMeta?.phonetic || buildPhoneticHint(result.targetText || result.text),
        coachNote: result.coachNote || '', articulationGuide: result.articulationGuide || null,
      }
      setResolvedPrompt(resolved)
      lastAudioRef.current = result.audioBase64
        ? { audioBase64: result.audioBase64, audioMimeType: result.audioMimeType, guideAudioBase64: result.guideAudioBase64 || '', guideAudioMimeType: result.guideAudioMimeType || '' }
        : null
      setCoachReady(true)
      if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
      if (autoplay) {
        if (lastAudioRef.current) await playCoachAudio()
        else {
          setTutorState('playing')
          try { await speakLocalPhrase(resolved.targetText, languageCode, profile.voiceSpeed || 1) }
          finally { setTutorState('idle') }
        }
      } else { setTutorState('idle') }
      return result
    } catch (requestError) {
      if (phrasebookMatch) {
        const localPrompt = {
          sourceText: phrasebookMatch.sourceText, targetText: phrasebookMatch.targetText,
          translation: phrasebookMatch.translation, translated: true,
          phonetic: phrasebookMatch.phonetic || buildPhoneticHint(phrasebookMatch.targetText),
          coachNote: sayLikeLocal ? `Natural ${language.label} phrasing.` : 'Textbook phrasing.',
          articulationGuide: buildPracticeGuide({ word: null, phraseMeta: null, phrase: phrasebookMatch.targetText, languageCode }),
        }
        setResolvedPrompt(localPrompt); setCoachReady(false); setTutorState('idle')
        if (autoplay) await speakLocalPhrase(localPrompt.targetText, languageCode, profile.voiceSpeed || 1)
        return localPrompt
      }
      setError(requestError.message); setTutorState('idle'); return null
    } finally { setLoadingPhrase(false) }
  }

  async function previewWord(word) {
    const target = word?.expectedWord || word
    if (!target) return
    setSelectedWord(typeof word === 'string' ? { expectedWord: word, status: 'correct' } : word)
    setShowGuide(true); setWordPreviewState('loading')
    try {
      const tutor = await postTutorSession({
        mode: 'quick-ask',
        text: target,
        languageCode,
        nativeLanguageCode: profile.nativeLanguage || 'en',
        includeAudio: false,
      })
      await speakLocalPhrase(tutor.audioText || tutor.naturalPhrase || target, languageCode, 0.85)
    } catch (requestError) { setError(requestError.message) }
    finally { setWordPreviewState('idle') }
  }

  const recorder = useAudioRecorder({
    async onRecordingComplete({ blob, durationMs, mimeType }) {
      setTutorState('thinking'); setError('')
      try {
        lastUserRecordingRef.current = { blob, mimeType }; setUserTakeReady(true)
        const audioBase64 = await blobToBase64(blob)
        const session = await auth.getValidSession()
        const result = await postTrainer(
          currentStep
            ? { mode: 'conversation', audioBase64, mimeType, durationMs, lesson: { languageLearning: languageCode, goal: profile.goal, correctionIntensity: profile.correctionIntensity, stepIndex: liveStepIndex, expectedPhrase: currentStep.expectedPhrase, customLesson: liveLesson } }
            : { mode: 'freeform-eval', text: phrase.trim(), expectedPhrase: practiceText, audioBase64, mimeType, durationMs, languageCode, correctionIntensity: profile.correctionIntensity },
          session.idToken,
        )
        if (result.profileSnapshot) auth.applyServerProfile(result.profileSnapshot)
        setAnalysis(result)
        const focusWord =
          result.visualGuide?.word ? { expectedWord: result.visualGuide.word, status: 'close' }
          : result.wordFeedback?.find((item) => item.status !== 'correct') || result.wordFeedback?.[0] || null
        setSelectedWord(focusWord); setShowGuide(Boolean(focusWord)); setShowCompare(true)
        if (currentStep) {
          const completed = result.nextStepIndex === 0 && liveStepIndex === liveLesson.steps.length - 1 && result.passed
          activeSession.update({ stepIndex: result.nextStepIndex, turn: result, updatedAt: new Date().toISOString(), completedAt: completed ? new Date().toISOString() : liveSession?.completedAt || '' })
          await playPayloadAudio(result)
        }
      } catch (requestError) { setError(requestError.message) }
      finally { setTutorState('idle') }
    },
  })

  const trainPhase = getTrainPhase({ hasCoachAudio, hasAnalysis: Boolean(analysis), recorderStatus: recorder.status, tutorState })

  async function handlePracticeTap() {
    if (!practiceText.trim()) { setError(currentStep ? 'Tap Hear first, then repeat the line.' : 'Type a phrase first.'); return }
    if (!offline.isOnline) { setError('New feedback needs internet. Saved items still replay offline.'); return }
    if (recorder.status === 'recording') { await recorder.stopRecording(); return }
    if (!currentStep && (!resolvedPrompt || resolvedPrompt.sourceText !== phrase.trim())) {
      const result = await fetchTtsForPhrase(phrase.trim(), { autoplay: false })
      if (!result) return
    }
    try { setError(''); setTutorState('idle'); await recorder.startRecording() }
    catch (recordingError) { setError(recordingError.message) }
  }

  const handlePhraseInputMic = useCallback(() => {
    const Recognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) { setError('Voice dictation is not available here.'); return }
    if (inputListenState === 'listening' && inputRecognitionRef.current) { inputRecognitionRef.current.stop(); setInputListenState('idle'); return }
    const recognition = new Recognition()
    recognition.lang = nativeLanguage.locale || 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1
    recognition.onstart = () => setInputListenState('listening')
    recognition.onend = () => setInputListenState('idle')
    recognition.onerror = () => { setInputListenState('idle'); setError('Could not capture dictation.') }
    recognition.onresult = (event) => { const transcript = event.results?.[0]?.[0]?.transcript || ''; if (transcript) setPhrase(transcript) }
    inputRecognitionRef.current = recognition; recognition.start()
  }, [inputListenState, nativeLanguage.locale])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const intent = window.sessionStorage.getItem('uselang-trainer-intent')
    if (intent !== 'voice') return
    if (currentStep || phrase.trim()) { window.sessionStorage.removeItem('uselang-trainer-intent'); return }
    const timer = window.setTimeout(() => { handlePhraseInputMic(); window.sessionStorage.removeItem('uselang-trainer-intent') }, 220)
    return () => window.clearTimeout(timer)
  }, [currentStep, handlePhraseInputMic, phrase])

  async function persistPractice(action = 'save') {
    if (!practiceText.trim()) { setError(currentStep ? 'Coach audio is not ready yet.' : 'Type a phrase first.'); return }
    setError('')
    const setState = action === 'download' ? setDownloadState : setSaveState
    if (!lastAudioRef.current) {
      if (currentStep) { const result = await fetchLivePrompt(liveStepIndex, { autoplay: false }); if (!result) return }
      else { const result = await fetchTtsForPhrase(phrase.trim(), { autoplay: false }); if (!result) return }
    }
    if (!lastAudioRef.current) { setError('Coach audio is unavailable.'); return }
    setState('saving')
    try {
      const id = `studio-${languageCode}-${Date.now()}`
      await offline.savePractice({ id, sentence: practiceText, phonetic: practicePhonetic, translation: practiceTranslation, language: language.label, scenarioLabel: liveLesson?.scenarioMeta?.title || 'Train', audioBase64: lastAudioRef.current.audioBase64, audioMimeType: lastAudioRef.current.audioMimeType, userAudioBlob: lastUserRecordingRef.current?.blob || null, userAudioMimeType: lastUserRecordingRef.current?.mimeType || '' })
      setState('saved'); window.setTimeout(() => setState('idle'), 2200)
    } catch (downloadError) { setError(downloadError.message); setState('idle') }
  }

  async function playSaved(item, source = 'coach', rate = 1) {
    savedAudioRef.current?.pause(); revokeObjectUrl(savedUrlRef.current)
    const blob = source === 'user' ? item.userAudioBlob : item.audioBlob
    const url = createObjectUrl(blob)
    if (!url) return
    savedUrlRef.current = url
    const audio = new Audio(url); audio.playbackRate = rate
    savedAudioRef.current = audio; setPlayingId(`${item.id}-${source}`)
    await audio.play()
    audio.addEventListener('ended', () => { setPlayingId(null); revokeObjectUrl(savedUrlRef.current); savedUrlRef.current = null }, { once: true })
  }

  const accuracy = typeof analysis?.accuracy === 'number' ? Math.round(analysis.accuracy * 100) : null
  const hasPhrase = Boolean(practiceText.trim())
  const hasResult = Boolean(analysis || resolvedPrompt || coachReady || liveTurn)
  const persistentMicState = resolvePersistentMicState({ recorderStatus: recorder.status, tutorState, hasResult, offline: !offline.isOnline })
  const sphereProps = getSphereProps(persistentMicState, tutorState)
  const improvementNotes = (analysis?.wordFeedback || []).filter((item) => item.status && item.status !== 'correct').slice(0, 2)
  const pronunciationTip = [activeGuide?.lipShape, activeGuide?.tonguePosition, activeGuide?.listenFor].filter(Boolean)[0] || null
  const isRecording = recorder.status === 'recording'

  return (
    <AppShell auth={auth} route={route} section="trainer">
      <div className="relative px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-10">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold transition ${currentStep ? 'bg-[#c9a97a]/14 text-[#a27e4f]' : 'bg-ink/[0.05] text-ink/40'}`}>
              {currentStep ? liveLesson?.scenarioMeta?.title || 'Lesson' : 'Quick mode'}
            </span>
            {offlineAi.localAiAvailable && (
              <span className="rounded-full bg-[#30d158]/10 px-2.5 py-1 text-[0.62rem] font-medium text-[#1c7c3a]">
                Local AI
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-medium ${offline.isOnline ? 'text-ink/30' : 'bg-amber/10 text-amber'}`}>
              {offline.isOnline ? '' : 'Offline'}
            </span>
          </div>
          <LanguagePicker languageCode={languageCode} onChange={setLanguageCode} />
        </div>

        {/* ─── Sphere ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-7 flex flex-col items-center"
        >
          <AISphere
            state={sphereProps.state}
            tone={sphereProps.tone}
            onTap={handlePracticeTap}
            disabled={
              persistentMicState === 'blocked' ||
              tutorState === 'thinking' ||
              tutorState === 'loading' ||
              (!hasPhrase && !currentStep && recorder.status !== 'recording')
            }
            size={196}
            activityLevel={recorder.bars?.reduce((a, b) => a + b, 0) / (recorder.bars?.length || 1) || 0}
            hideLabel
          />

          {/* Voice wave — only when recording */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="mt-4 w-full max-w-[180px]"
              >
                <VoiceWave bars={recorder.bars} active={isRecording} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* State label */}
          <motion.p
            key={persistentMicState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 text-[0.82rem] font-medium text-ink/44"
          >
            {isRecording
              ? 'Listening — tap to finish'
              : tutorState === 'playing'
                ? 'Playing coach audio...'
                : tutorState === 'loading' || tutorState === 'thinking'
                  ? 'Lane is thinking...'
                  : hasPhrase
                    ? MIC_STATE_COPY[persistentMicState]
                    : `Describe what you want to say in ${nativeLanguage.label}`
            }
          </motion.p>
        </motion.div>

        {/* ─── Step rail ─── */}
        <div className="mt-6 flex justify-center">
          <StepRail current={trainPhase} />
        </div>

        {/* ─── Phrase display ─── */}
        <AnimatePresence>
          {hasPhrase && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-7"
            >
              {/* Main phrase */}
              <div className="text-center">
                {(resolvedPrompt?.translated || currentStep) && (
                  <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink/32">
                    {currentStep ? 'Say this' : 'You will say'}
                  </p>
                )}
                <h2 className="font-serif text-[1.75rem] italic leading-snug tracking-[-0.01em] text-ink">
                  {practiceText}
                </h2>
                {practicePhonetic && (
                  <p className="mt-2 font-serif text-[0.84rem] text-ink/34">/{practicePhonetic}/</p>
                )}
                {practiceTranslation && (
                  <p className="mt-1.5 text-[0.8rem] text-ink/44">{practiceTranslation}</p>
                )}
                {resolvedPrompt?.coachNote && (
                  <p className="mt-1.5 text-[0.72rem] text-ink/32">{resolvedPrompt.coachNote}</p>
                )}
              </div>

              {/* Word pills — show after analysis */}
              {phraseWords.length > 1 && analysis && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {phraseWords.map((word, idx) => {
                    const isActive = normalizeText(selectedWord?.expectedWord) === normalizeText(word.expectedWord)
                    const tone =
                      isActive ? 'bg-accent/12 text-accent ring-1 ring-accent/20'
                      : word.status === 'incorrect' ? 'bg-danger/8 text-danger'
                      : word.status === 'close' ? 'bg-amber/[0.12] text-amber'
                      : 'bg-ink/[0.04] text-ink/55'
                    return (
                      <button
                        key={`${word.expectedWord}-${idx}`}
                        type="button"
                        onClick={() => previewWord(word)}
                        className={`rounded-full px-3 py-1.5 text-[0.76rem] font-medium transition active:scale-[0.97] ${tone}`}
                      >
                        {word.expectedWord}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Lesson step context ─── */}
        {currentStep && (
          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink/28">
                  Step {liveStepIndex + 1} of {liveLesson.steps.length}
                </span>
                {analysis?.comparisonNotes && (
                  <span className="text-[0.62rem] font-semibold text-[#c9a97a]">
                    · Coach note
                  </span>
                )}
              </div>
              {accuracy !== null && (
                <AccuracyBadge accuracy={accuracy} />
              )}
            </div>
            {(analysis?.comparisonNotes || currentStep.coachTip) && (
              <p className="mt-2 text-[0.82rem] leading-snug text-ink/48">
                {analysis?.comparisonNotes || currentStep.coachTip}
              </p>
            )}
          </section>
        )}

        {/* ─── Session completed ─── */}
        {liveSession?.completedAt && (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-[1.65rem] bg-[#1a1714] px-5 py-4 text-white"
          >
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/50">Completed</p>
            <p className="mt-1.5 text-[0.96rem] font-semibold leading-snug">
              You can now {liveLesson?.scenarioMeta?.completionLine?.replace(/^You can now\s*/i, '').replace(/\.$/, '') || 'use this in a real conversation'}.
            </p>
            <button
              type="button"
              onClick={() => activeSession.clear()}
              className="mt-3 rounded-full bg-white/10 px-3 py-1.5 text-[0.72rem] font-medium text-white/80 transition hover:bg-white/15"
            >
              Start another
            </button>
          </motion.section>
        )}

        {/* ─── Action strip ─── */}
        <div className="mt-7">
          {/* Primary: Hear + accuracy */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => currentStep ? fetchLivePrompt(liveStepIndex) : fetchTtsForPhrase()}
              disabled={currentStep ? tutorState === 'thinking' || tutorState === 'loading' : !phrase.trim() || loadingPhrase}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1a1714] py-3 text-[0.84rem] font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
            >
              {tutorState === 'playing' ? (
                <motion.span className="h-2 w-2 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {loadingPhrase ? 'Loading...' : tutorState === 'playing' ? 'Playing...' : 'Hear it'}
            </button>
            {accuracy !== null && <AccuracyBadge accuracy={accuracy} large />}
          </div>

          {/* Secondary row */}
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            <ActionChip
              onClick={() => playCoachAudio(0.82)}
              disabled={!hasPhrase}
            >
              Slow
            </ActionChip>
            <ActionChip
              onClick={() => setShowCompare((c) => !c)}
              disabled={!coachReady || !userTakeReady}
              active={showCompare}
            >
              Compare
            </ActionChip>
            <ActionChip
              onClick={() => persistPractice('save')}
              disabled={saveState === 'saving' || !hasPhrase}
              active={saveState === 'saved'}
            >
              {saveState === 'saving' ? '...' : saveState === 'saved' ? 'Saved' : 'Save'}
            </ActionChip>
            <ActionChip
              onClick={() => persistPractice('download')}
              disabled={downloadState === 'saving' || !hasPhrase}
              active={downloadState === 'saved'}
            >
              {downloadState === 'saving' ? '...' : downloadState === 'saved' ? 'Ready' : 'Download'}
            </ActionChip>
          </div>

          {/* Style toggle */}
          {!currentStep && (
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setSayLikeLocal((c) => !c)}
                className={`rounded-full px-3.5 py-1.5 text-[0.7rem] font-medium transition ${sayLikeLocal ? 'bg-[#f5ede0] text-[#c9a97a]' : 'bg-ink/[0.04] text-ink/38'}`}
              >
                {sayLikeLocal ? 'Native phrasing' : 'Textbook'}
              </button>
            </div>
          )}
        </div>

        {/* ─── Quick mode input ─── */}
        {!currentStep && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-ink/30">
                Type or say in {nativeLanguage.label}
              </p>
              <PersistentMicButton
                state={inputListenState === 'listening' ? 'listening' : 'idle'}
                onClick={handlePhraseInputMic}
                size={38}
              />
            </div>
            <div className="mt-3 flex items-start gap-2">
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                rows={2}
                placeholder={`Describe what you want to say — Lane translates to ${language.label}`}
                className="min-h-[3.5rem] flex-1 rounded-[1.25rem] bg-white/75 px-4 py-3 text-[0.9rem] font-medium leading-snug text-ink placeholder:text-ink/28 shadow-[0_12px_32px_-24px_rgba(60,45,25,0.18)] backdrop-blur-[14px] ring-1 ring-black/[0.035]"
              />
            </div>
            {phrase.trim() && (
              <button
                type="button"
                onClick={() => fetchTtsForPhrase(phrase.trim())}
                disabled={loadingPhrase}
                className="mt-3 w-full rounded-full bg-[#1a1714] py-3 text-[0.84rem] font-semibold text-white transition active:scale-[0.98] disabled:opacity-35"
              >
                {loadingPhrase ? 'Building...' : `Translate & hear in ${language.label} →`}
              </button>
            )}

            <div className="mt-6">
              <p className="mb-3 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-ink/28">
                Or try one of these
              </p>
              <StarterCarousel starters={starters} onSelect={(t) => setPhrase(t)} />
            </div>
          </section>
        )}

        {/* ─── Error ─── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-[1rem] bg-danger/8 px-4 py-3 text-[0.82rem] text-danger"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Feedback ─── */}
        <AnimatePresence>
          {analysis && (
            <FeedbackCard
              analysis={analysis}
              coachReady={coachReady}
              userTakeReady={userTakeReady}
              selectedWord={selectedWord}
              improvementNotes={improvementNotes}
              pronunciationTip={pronunciationTip}
              onSelectWord={previewWord}
              onOpenGuide={() => {
                const focusWord = selectedWord || phraseWords.find((w) => w.status !== 'correct') || phraseWords[0]
                if (!focusWord) return
                setSelectedWord(focusWord); setShowGuide(true)
              }}
              onPlayCoach={() => playCoachAudio()}
              onPlayUser={() => playUserAudio()}
            />
          )}
        </AnimatePresence>

        {/* ─── Compare panel ─── */}
        <AnimatePresence>
          {showCompare && (coachReady || userTakeReady) && (
            <ComparePanel
              coachReady={coachReady}
              userTakeReady={userTakeReady}
              onPlayCoach={() => playCoachAudio()}
              onPlayUser={() => playUserAudio()}
              onClose={() => setShowCompare(false)}
            />
          )}
        </AnimatePresence>

        {/* ─── Articulation guide ─── */}
        <AnimatePresence>
          {showGuide && selectedWord && (
            <ArticulationCard
              guide={activeGuide}
              media={articulationMedia}
              wordPreviewState={wordPreviewState}
              onReplayWord={() => previewWord(selectedWord)}
              onReplaySlow={() => playCoachAudio(0.82)}
              onClose={() => setShowGuide(false)}
            />
          )}
        </AnimatePresence>

        {/* ─── Homework ─── */}
        {(analysis || liveSession?.completedAt) && hasPhrase && (
          <HomeworkCard homework={homework} />
        )}

        {/* ─── Library preview ─── */}
        {savedItems.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-ink/28">
                Recent saves
              </p>
              <button
                type="button"
                onClick={() => route.navigate(APP_ROUTES.downloads)}
                className="text-[0.72rem] font-semibold text-ink/40 transition hover:text-ink"
              >
                Library →
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {savedItems.map((item) => (
                <SavedPreviewRow key={item.id} item={item} playingId={playingId} onPlay={playSaved} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

/* ─── Accuracy badge ─── */
function AccuracyBadge({ accuracy, large = false }) {
  const color = accuracy >= 88 ? 'text-mint' : accuracy >= 70 ? 'text-amber' : 'text-accent'
  return (
    <span className={`tabular-nums font-bold leading-none ${color} ${large ? 'text-[2.2rem]' : 'text-[1.2rem]'}`}>
      {accuracy}
      <span className={`font-medium ${large ? 'text-[1rem]' : 'text-[0.72rem]'} opacity-60`}>%</span>
    </span>
  )
}

/* ─── Action chip ─── */
function ActionChip({ children, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full py-2.5 text-[0.72rem] font-semibold transition active:scale-[0.97] disabled:opacity-30 ${
        active ? 'bg-[#30d158]/12 text-[#1c7c3a]' : 'bg-ink/[0.05] text-ink/52 hover:bg-ink/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}

/* ─── Step rail ─── */
function StepRail({ current }) {
  const steps = ['listen', 'repeat', 'improve']
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => {
        const active = step === current
        const done = steps.indexOf(current) > i
        return (
          <div key={step} className="flex items-center gap-3">
            {i > 0 && <div className={`h-px w-6 ${done ? 'bg-[#c9a97a]/50' : 'bg-ink/[0.07]'}`} />}
            <span className={`text-[0.62rem] font-semibold uppercase tracking-[0.12em] transition ${
              active ? 'text-[#c9a97a]' : done ? 'text-[#c9a97a]/50' : 'text-ink/20'
            }`}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Feedback card ─── */
function FeedbackCard({ analysis, coachReady, userTakeReady, improvementNotes, pronunciationTip, onSelectWord, onOpenGuide, onPlayCoach, onPlayUser }) {
  const accuracy = typeof analysis.accuracy === 'number' ? Math.round(analysis.accuracy * 100) : null
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink/30">Feedback</p>
          <p className="mt-2 text-[0.88rem] leading-snug text-ink/55">
            {analysis.explanation || 'Compare your take to the coach version.'}
          </p>
          {analysis.transcript && (
            <p className="mt-2 text-[0.78rem] text-ink/34">
              You said: <em className="text-ink/52">"{analysis.transcript}"</em>
            </p>
          )}
        </div>
        {accuracy !== null && <AccuracyBadge accuracy={accuracy} large />}
      </div>

      {improvementNotes.length > 0 && (
        <div className="mt-4 space-y-2">
          {improvementNotes.map((item, idx) => (
            <button
              key={`${item.expectedWord}-${idx}`}
              type="button"
              onClick={() => onSelectWord(item)}
              className="flex w-full items-center justify-between gap-3 rounded-[1.15rem] bg-white/72 px-3.5 py-3 text-left ring-1 ring-black/[0.03] transition active:scale-[0.99]"
            >
              <div>
                <p className="text-[0.84rem] font-semibold text-ink">{item.expectedWord}</p>
                <p className="mt-0.5 text-[0.72rem] text-ink/40">
                  {item.status === 'incorrect' ? 'Needs a cleaner sound.' : 'Close — refine the shape.'}
                </p>
              </div>
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[#c9a97a]">Fix →</span>
            </button>
          ))}
        </div>
      )}

      {pronunciationTip && (
        <div className="mt-3 rounded-[1.15rem] bg-[#f5ede0]/80 px-3.5 py-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#a27e4f]">Tip</p>
          <p className="mt-1 text-[0.8rem] leading-snug text-ink/58">{pronunciationTip}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenGuide}
          className="rounded-full bg-ink/[0.05] py-2.5 text-[0.74rem] font-medium text-ink/52 transition hover:bg-ink/[0.08] active:scale-[0.97]"
        >
          Articulation
        </button>
        <button
          type="button"
          onClick={onPlayCoach}
          disabled={!coachReady}
          className="rounded-full bg-ink/[0.05] py-2.5 text-[0.74rem] font-medium text-ink/52 transition disabled:opacity-30 hover:bg-ink/[0.08] active:scale-[0.97]"
        >
          Coach
        </button>
        <button
          type="button"
          onClick={onPlayUser}
          disabled={!userTakeReady}
          className="rounded-full bg-ink/[0.05] py-2.5 text-[0.74rem] font-medium text-ink/52 transition disabled:opacity-30 hover:bg-ink/[0.08] active:scale-[0.97]"
        >
          You
        </button>
      </div>
    </motion.section>
  )
}

/* ─── Articulation card ─── */
function ArticulationCard({ guide, media, wordPreviewState, onReplayWord, onReplaySlow, onClose }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22 }}
      className="mt-6 rounded-[1.65rem] bg-white/88 p-5 shadow-[0_18px_48px_-28px_rgba(15,20,25,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink/30">How to say it</p>
          <h3 className="mt-1.5 font-display text-[1.3rem] font-semibold tracking-[-0.03em] text-ink">{guide.word}</h3>
          <p className="mt-0.5 font-serif text-[0.84rem] italic text-ink/34">/{guide.phonetic}/</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.05] text-ink/36 transition hover:bg-ink/[0.08]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="mt-5 flex gap-4">
        <div className="shrink-0">
          <PronunciationDiagram guide={guide} size={116} compact />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {guide.tonguePosition && <GuideRow label="Tongue" value={guide.tonguePosition} />}
          {guide.lipShape && <GuideRow label="Lips" value={guide.lipShape} />}
          {guide.airflow && <GuideRow label="Air" value={guide.airflow} />}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {guide.listenFor && <GuideRow label="Listen for" value={guide.listenFor} />}
        {guide.commonMistake && <GuideRow label="Avoid" value={guide.commonMistake} />}
      </div>

      {media?.readyForRender && (
        <div className="mt-3 rounded-[1rem] bg-[#f5ede0]/70 px-3.5 py-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#a27e4f]">Motion guide</p>
          <p className="mt-1 text-[0.8rem] font-semibold text-ink">{media.title}</p>
          <p className="mt-0.5 text-[0.72rem] leading-snug text-ink/44">{media.detail}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onReplayWord} className="rounded-full bg-ink/[0.05] py-2.5 text-[0.76rem] font-medium text-ink/55 transition hover:bg-ink/[0.08]">
          {wordPreviewState === 'loading' ? 'Playing...' : 'Replay word'}
        </button>
        <button type="button" onClick={onReplaySlow} className="rounded-full bg-ink/[0.05] py-2.5 text-[0.76rem] font-medium text-ink/55 transition hover:bg-ink/[0.08]">
          Slow coach
        </button>
      </div>
    </motion.section>
  )
}

function GuideRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink/26">{label}</p>
      <p className="mt-0.5 text-[0.76rem] leading-snug text-ink/55">{value}</p>
    </div>
  )
}

/* ─── Homework card ─── */
function HomeworkCard({ homework }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-7"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-ink/30">{homework.title}</p>
        <span className="text-[0.62rem] font-medium text-ink/28">{homework.summary}</span>
      </div>
      <div className="mt-3 space-y-2">
        {homework.tasks.map((task, idx) => (
          <div key={`${task.label}-${idx}`} className="flex items-start gap-3 rounded-[1.15rem] bg-white/72 px-3.5 py-3 ring-1 ring-black/[0.03]">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#c9a97a' }} />
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink/28">{task.label}</p>
              <p className="mt-0.5 text-[0.8rem] font-medium leading-snug text-ink">{task.prompt}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[1.15rem] bg-[#1a1714] px-3.5 py-3 text-white">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/50">Outcome</p>
        <p className="mt-1 text-[0.82rem] leading-snug text-white/80">{homework.completionLine}</p>
      </div>
    </motion.section>
  )
}

/* ─── Compare panel ─── */
function ComparePanel({ coachReady, userTakeReady, onPlayCoach, onPlayUser, onClose }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-5 rounded-[1.5rem] bg-white/88 p-4 shadow-[0_16px_44px_-28px_rgba(15,20,25,0.18)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-ink/30">Compare</p>
        <button type="button" onClick={onClose} className="text-[0.72rem] font-medium text-ink/32 transition hover:text-ink">
          Close
        </button>
      </div>
      <p className="mt-1 text-[0.8rem] text-ink/45">Play both back-to-back to hear the difference.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPlayCoach}
          disabled={!coachReady}
          className="flex items-center justify-between rounded-[1rem] bg-ink/[0.04] px-3.5 py-2.5 transition disabled:opacity-30 active:scale-[0.98]"
        >
          <span className="text-[0.8rem] font-medium text-ink/55">Coach</span>
          <span className={`text-[0.64rem] font-semibold uppercase tracking-[0.08em] ${coachReady ? 'text-[#c9a97a]' : 'text-ink/20'}`}>Play</span>
        </button>
        <button
          type="button"
          onClick={onPlayUser}
          disabled={!userTakeReady}
          className="flex items-center justify-between rounded-[1rem] bg-ink/[0.04] px-3.5 py-2.5 transition disabled:opacity-30 active:scale-[0.98]"
        >
          <span className="text-[0.8rem] font-medium text-ink/55">Your take</span>
          <span className={`text-[0.64rem] font-semibold uppercase tracking-[0.08em] ${userTakeReady ? 'text-[#c9a97a]' : 'text-ink/20'}`}>Play</span>
        </button>
      </div>
    </motion.section>
  )
}

/* ─── Language picker ─── */
function LanguagePicker({ languageCode, onChange }) {
  const [open, setOpen] = useState(false)
  const current = SUPPORTED_LANGUAGES.find((entry) => entry.code === languageCode) || SUPPORTED_LANGUAGES[0]
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-ink/[0.05] px-3.5 text-[0.76rem] font-medium text-ink/50 transition hover:bg-ink/[0.08]"
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-[1.15rem] bg-white p-1 shadow-[0_16px_44px_-16px_rgba(15,20,25,0.18)]"
            >
              {SUPPORTED_LANGUAGES.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => { onChange(entry.code); setOpen(false) }}
                  className={`flex w-full items-center justify-between rounded-[0.85rem] px-3.5 py-2.5 text-[0.82rem] transition ${
                    entry.code === languageCode ? 'bg-accent/[0.08] font-semibold text-accent' : 'text-ink/55 hover:bg-ink/[0.03]'
                  }`}
                >
                  {entry.label}
                  {entry.code === languageCode && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Saved preview row ─── */
function SavedPreviewRow({ item, playingId, onPlay }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] bg-white/76 px-3.5 py-3 ring-1 ring-black/[0.035]">
      <div className="min-w-0 flex-1">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-ink/28">{item.language}</p>
        <p className="mt-0.5 text-[0.86rem] font-semibold leading-snug text-ink">{item.sentence}</p>
        {item.phonetic && <p className="mt-0.5 font-serif text-[0.72rem] text-ink/30">/{item.phonetic}/</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPlay(item, 'coach')} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1714] text-white transition active:scale-95">
          {playingId === `${item.id}-coach`
            ? <motion.span className="h-2 w-2 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          }
        </button>
        <button type="button" onClick={() => onPlay(item, 'coach', 0.82)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.05] text-ink/45 transition active:scale-95">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19 5v14" strokeOpacity="0.4" /><path d="M15 8v8" strokeOpacity="0.6" />
          </svg>
        </button>
        {item.userAudioBlob && (
          <button type="button" onClick={() => onPlay(item, 'user')} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.05] text-ink/45 transition active:scale-95">
            {playingId === `${item.id}-user`
              ? <motion.span className="h-2 w-2 rounded-full bg-ink/50" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /></svg>
            }
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Starter carousel ─── */
function StarterCarousel({ starters, onSelect }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % starters.length), 3200)
    return () => clearInterval(timerRef.current)
  }, [starters.length])

  function advance(dir) {
    clearInterval(timerRef.current)
    setIdx((i) => { const next = i + dir; return next < 0 ? starters.length - 1 : next >= starters.length ? 0 : next })
  }

  const starter = starters[idx]

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.button
          key={idx}
          type="button"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={(_, info) => { if (info.offset.x < -45) advance(1); else if (info.offset.x > 45) advance(-1) }}
          onClick={() => onSelect(starter.translation)}
          className="relative w-full overflow-hidden rounded-[1.35rem] bg-white/72 px-4 py-4 text-left ring-1 ring-black/[0.035] transition active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full" style={{ background: '#c9a97a' }} />
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c9a97a]/70">Try this phrase</p>
          <p className="mt-2 font-serif text-[1rem] italic leading-snug text-ink">{starter.sentence}</p>
          <p className="mt-1.5 text-[0.78rem] text-ink/40">{starter.translation}</p>
          <p className="mt-1 font-serif text-[0.68rem] text-ink/26">/{starter.phonetic}/</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {starters.map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ width: i === idx ? '1rem' : '0.25rem', opacity: i === idx ? 1 : 0.22 }}
                  transition={{ duration: 0.22 }}
                  className="inline-block h-[2.5px] rounded-full bg-[#c9a97a]"
                />
              ))}
            </div>
            <span className="flex items-center gap-1 text-[0.7rem] font-semibold text-[#c9a97a]">
              Use →
            </span>
          </div>
        </motion.button>
      </AnimatePresence>
      <div className="mt-1.5 flex items-center justify-between px-1">
        <button type="button" onClick={() => advance(-1)} className="text-[0.68rem] font-medium text-ink/24 transition active:text-ink/50">← Prev</button>
        <span className="text-[0.62rem] text-ink/18">{idx + 1} / {starters.length}</span>
        <button type="button" onClick={() => advance(1)} className="text-[0.68rem] font-medium text-ink/24 transition active:text-ink/50">Next →</button>
      </div>
    </div>
  )
}
