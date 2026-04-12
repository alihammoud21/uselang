import { fromFirestoreFields, toFirestoreFields } from '../../lib/firestore-values.js'
import {
  buildCustomLessonBundle,
  buildGeneratedLessonBundle,
  buildLessonBrief,
  getPracticePhraseEntries,
  getLessonBundle,
} from '../../lib/lessons.js'
import { getDailyLimit, getLanguageByCode } from '../../lib/languages.js'
import { callLocalGenerator, shouldUseLocalGenerator } from '../../lib/local-generator-client.js'
import { applyPracticeProgress } from '../../lib/progress-engine.js'
import { createDefaultUsageStats, mergeUsageStats } from '../../lib/usage-stats.js'
import {
  analyzeUtterance,
  buildOpeningTurn,
  buildTutorTurn,
  buildWordArticulationGuide,
  syllabify,
} from '../../lib/tutor-engine.js'

const PROJECT_ID = 'uselang'
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const LESSON_PASS_THRESHOLD = 0.9
const ADVANCE_COMMANDS = [
  'next one',
  'go to the next one',
  'go next',
  'move on',
  'skip ahead',
  'i got this',
  'let us move on',
  'lets move on',
]

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  }
}

function getBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization
  return value?.startsWith('Bearer ') ? value.slice(7) : ''
}

function decodeToken(idToken) {
  const parts = idToken.split('.')
  if (parts.length < 2) {
    throw new Error('Invalid Firebase token.')
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

function normalizeCommandText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhrase(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shouldAdvanceLesson(transcript = '') {
  const normalized = normalizeCommandText(transcript)
  if (!normalized) return false
  return ADVANCE_COMMANDS.some((phrase) => normalized.includes(phrase))
}

function resolvePracticePhraseMatch(languageCode, text = '') {
  const entries = getPracticePhraseEntries(languageCode)
  const normalized = normalizePhrase(text)
  if (!normalized) return null

  const exactTarget = entries.find((entry) => normalizePhrase(entry.targetText) === normalized)
  if (exactTarget) {
    return { ...exactTarget, translated: false }
  }

  const exactSource = entries.find((entry) => normalizePhrase(entry.sourceText) === normalized)
  if (exactSource) {
    return { ...exactSource, translated: true }
  }

  let best = null
  let bestScore = 0
  const inputWords = normalized.split(/\s+/)

  for (const entry of entries) {
    const candidate = normalizePhrase(entry.sourceText)
    if (!candidate) continue
    const candidateWords = candidate.split(/\s+/)
    const shared = inputWords.filter((word) => candidateWords.includes(word)).length
    const score =
      normalized === candidate
        ? 1
        : normalized.includes(candidate) || candidate.includes(normalized)
          ? 0.92
          : shared / Math.max(inputWords.length, candidateWords.length)

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

function documentUrl(pathname) {
  return `${FIRESTORE_BASE}/${pathname}`
}

async function firestoreRead(pathname, idToken) {
  const fetchResponse = await fetch(documentUrl(pathname), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (fetchResponse.status === 404) {
    return null
  }

  const payload = await fetchResponse.json()

  if (!fetchResponse.ok) {
    throw new Error(payload?.error?.message || 'Unable to read Firestore document.')
  }

  return fromFirestoreFields(payload.fields ?? {})
}

async function firestorePatch(pathname, data, idToken) {
  const fetchResponse = await fetch(documentUrl(pathname), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  })

  const payload = await fetchResponse.json().catch(() => null)

  if (!fetchResponse.ok) {
    throw new Error(payload?.error?.message || 'Unable to write Firestore document.')
  }

  return payload
}

function getLocalDateKey(date, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function syncUsageState(profile) {
  const now = new Date()
  const timeZone = profile.timezone || 'UTC'
  const lastReset = profile.lastReset ? new Date(profile.lastReset) : now
  const todayKey = getLocalDateKey(now, timeZone)
  const resetKey = getLocalDateKey(lastReset, timeZone)

  let nextProfile = { ...profile }

  if (profile.trialActive && profile.plan === 'base') {
    const createdAt = profile.createdAt ? new Date(profile.createdAt) : now
    const elapsed = now.getTime() - createdAt.getTime()
    if (elapsed >= 7 * 24 * 60 * 60 * 1000) {
      nextProfile = {
        ...nextProfile,
        trialActive: false,
      }
    }
  }

  if (todayKey !== resetKey) {
    nextProfile = {
      ...nextProfile,
      minutesUsedToday: 0,
      lastReset: now.toISOString(),
    }
  }

  return nextProfile
}

async function transcribeAudio(audioBuffer, mimeType, language) {
  const sttResponse = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=${language.sttCode}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_STT_API_KEY}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
    },
  )

  const payload = await sttResponse.json()

  if (!sttResponse.ok) {
    throw new Error(payload?.err_msg || 'Deepgram transcription failed.')
  }

  return payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || ''
}

async function synthesizeSpeech(text, language) {
  const ttsResponse = await fetch(`https://api.deepgram.com/v1/speak?model=${language.ttsModel}&encoding=mp3`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_TTS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!ttsResponse.ok) {
    const payload = await ttsResponse.text()
    throw new Error(payload || 'Deepgram synthesis failed.')
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  return {
    audioBase64: audioBuffer.toString('base64'),
    audioMimeType: 'audio/mpeg',
  }
}

function applyUsageStats(profile, delta = {}, now = new Date()) {
  return {
    ...profile,
    usageStats: mergeUsageStats(profile.usageStats || createDefaultUsageStats(), delta, now),
  }
}

function shouldGenerateGuideAudio(profile, targetLanguage) {
  const nativeLanguage = getLanguageByCode(profile.nativeLanguage || 'en')
  return nativeLanguage.code === 'en' && nativeLanguage.code !== targetLanguage.code
}

async function buildGuideAudio(turn, profile, targetLanguage) {
  if (!turn?.guideText || !shouldGenerateGuideAudio(profile, targetLanguage)) {
    return null
  }

  const guideLanguage = getLanguageByCode(profile.nativeLanguage || 'en')
  const audio = await synthesizeSpeech(turn.guideText, guideLanguage)
  return {
    ...audio,
    guideLanguageCode: guideLanguage.code,
  }
}

function applyProfileUsage(profile, durationMinutes) {
  const dailyLimit = getDailyLimit(profile)
  const minutesUsedToday = Number(profile.minutesUsedToday || 0)
  return {
    ...profile,
    minutesUsedToday: Math.min(dailyLimit, Number((minutesUsedToday + durationMinutes).toFixed(2))),
    lastReset: profile.lastReset || new Date().toISOString(),
  }
}

function buildUpdatedProfile(profile, options = {}) {
  const { accuracy = 0, durationMinutes = 0, challengeCompleted = false, dailyChallengeCompleted = false } = options
  const usageProfile = applyProfileUsage(profile, durationMinutes)
  return applyPracticeProgress(usageProfile, {
    accuracy,
    durationMinutes,
    challengeCompleted,
    dailyChallengeCompleted,
  })
}

async function generateLocalLesson(event, profile, request, languageCode, fallbackGoalId) {
  if (!shouldUseLocalGenerator(event)) {
    return buildCustomLessonBundle(languageCode, request, fallbackGoalId)
  }

  const generated = await callLocalGenerator(
    '/generate-lesson',
    {
      request,
      targetLanguageCode: languageCode,
      nativeLanguageCode: profile.nativeLanguage || 'en',
      confidenceLevel: profile.confidenceLevel,
      tutorStyle: profile.tutorStyle,
    },
    event,
  )

  if (generated?._meta?.unsupported) {
    return null
  }

  const looksUntranslated = (generated.phrases || []).every((phrase) => {
    const english = normalizePhrase(phrase?.english || '')
    const target = normalizePhrase(phrase?.target || '')
    return english && target && english === target
  })

  if (looksUntranslated && languageCode !== 'en') {
    return null
  }

  return buildGeneratedLessonBundle(languageCode, request, generated)
}

async function generateLocalDrill(event, profile, payload, fallbackText) {
  if (!shouldUseLocalGenerator(event)) {
    return null
  }

  return callLocalGenerator(
    '/generate-drill',
    {
      text: fallbackText,
      targetLanguageCode: payload.languageCode || profile.languageLearning,
      nativeLanguageCode: payload.sourceLanguageCode || profile.nativeLanguage || 'en',
      sayLikeLocal: payload.sayLikeLocal ?? profile.sayLikeLocal ?? true,
    },
    event,
  )
}

function pickFocusWord(text = '') {
  const parts = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.find((part) => part.length > 3) || parts[0] || ''
}

function buildPromptGuide({ translation, languageLabel, profile }) {
  const guideLanguage = getLanguageByCode(profile.nativeLanguage || 'en')
  if (guideLanguage.code === 'en') {
    if (translation) {
      return `In ${languageLabel}, say this. It means: ${translation}`
    }
    return `In ${languageLabel}, listen first and then repeat the phrase.`
  }

  if (translation) {
    return `Listen first. This means: ${translation}`
  }

  return `Listen first and then repeat the phrase in ${languageLabel}.`
}

function buildPromptArticulationGuide(text = '', languageCode = 'fr') {
  const focusWord = pickFocusWord(text)
  const articulation = buildWordArticulationGuide(focusWord, { languageCode })
  return {
    word: focusWord,
    phonetic: syllabify(focusWord).join(' · ') || focusWord,
    tonguePosition: articulation.tonguePosition,
    lipShape: articulation.lipShape,
    airflow: articulation.airflow,
    slowWord: articulation.slowWord,
    diagramMode: articulation.diagramMode,
    listenFor: articulation.listenFor,
    commonMistake: articulation.commonMistake,
  }
}

function resolveLesson(payload, profile) {
  const incomingCustomLesson = payload.lesson?.customLesson

  if (incomingCustomLesson?.steps?.length) {
    const language = getLanguageByCode(
      incomingCustomLesson.language?.code || payload.lesson?.languageLearning || profile.languageLearning,
    )

    return {
      ...incomingCustomLesson,
      language,
    }
  }

  return getLessonBundle(profile.languageLearning, profile.goal)
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' })
  }

  if (!process.env.DEEPGRAM_STT_API_KEY || !process.env.DEEPGRAM_TTS_API_KEY) {
    return response(500, { error: 'Deepgram environment variables are missing.' })
  }

  try {
    const idToken = getBearerToken(event.headers)
    if (!idToken) {
      return response(401, { error: 'Missing Firebase token.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const decoded = decodeToken(idToken)
    const uid = decoded.user_id || decoded.sub

    const profilePath = `users/${uid}`
    const profile = await firestoreRead(profilePath, idToken)

    if (!profile) {
      return response(404, { error: 'User profile not found.' })
    }

    const syncedProfile = syncUsageState(profile)
    const lesson = resolveLesson(payload, syncedProfile)
    const stepIndex = Number(payload.lesson?.stepIndex || 0)
    const currentStep = lesson.steps[stepIndex % lesson.steps.length]

    if (payload.mode === 'build-lesson') {
      const request = String(payload.request || '').trim()
      if (!request) {
        return response(400, { error: 'No lesson request provided.' })
      }

      const customLesson = await generateLocalLesson(
        event,
        syncedProfile,
        request,
        payload.lesson?.languageLearning || syncedProfile.languageLearning,
        payload.lesson?.goal || syncedProfile.goal,
      )
      if (!customLesson) {
        return response(422, {
          error: 'This request needs the local lesson generator or a supported curated scenario.',
        })
      }
      const tutorTurn = buildOpeningTurn({
        lessonStep: customLesson.steps[0],
        languageLabel: customLesson.language.label,
        profile: syncedProfile,
        scenarioMeta: customLesson.scenarioMeta,
      })
      const audio = await synthesizeSpeech(tutorTurn.speechText, customLesson.language)
      const guideAudio = await buildGuideAudio(tutorTurn, syncedProfile, customLesson.language)
      const nextProfile = applyUsageStats(syncedProfile, {
        customPlanBuilds: 1,
        totalTtsCalls: guideAudio ? 2 : 1,
      })

      await firestorePatch(profilePath, nextProfile, idToken)

      return response(200, {
        ...tutorTurn,
        ...audio,
        ...(guideAudio || {}),
        nextStepIndex: 0,
        customLesson,
        lessonBrief: buildLessonBrief(customLesson),
        profileSnapshot: nextProfile,
      })
    }

    // Trainer free-form: synthesize TTS for an arbitrary phrase the user typed.
    if (payload.mode === 'freeform-prompt') {
      const sourceText = String(payload.text || '').trim()
      if (!sourceText) {
        return response(400, { error: 'No phrase provided.' })
      }
      const targetLanguage =
        getLanguageByCode(payload.languageCode || syncedProfile.languageLearning) || lesson.language
      const sourceLanguageCode = payload.sourceLanguageCode || syncedProfile.nativeLanguage || 'en'
      const shouldTranslate = sourceLanguageCode && sourceLanguageCode !== targetLanguage.code
      const translationHint = String(payload.translationHint || '').trim()
      let translatedText = sourceText
      let translation = translationHint

      if (shouldTranslate) {
        const phrasebookMatch = resolvePracticePhraseMatch(targetLanguage.code, sourceText)
        if (phrasebookMatch?.translated) {
          translatedText = String(phrasebookMatch.targetText || sourceText).trim() || sourceText
          translation = String(phrasebookMatch.translation || phrasebookMatch.sourceText || sourceText).trim() || sourceText
        }
      }

      if (shouldTranslate && normalizePhrase(translatedText) === normalizePhrase(sourceText)) {
        const drill = await generateLocalDrill(event, syncedProfile, payload, sourceText)
        if (!drill || drill?._meta?.unsupported) {
          return response(400, {
            error: 'This phrase is not supported in fallback mode yet. Use a saved example or run the local lesson generator.',
          })
        }
        translatedText = String(drill?.phrases?.[0]?.target || sourceText).trim() || sourceText
        translation = String(drill?.phrases?.[0]?.english || sourceText).trim() || sourceText
        if (
          targetLanguage.code !== sourceLanguageCode &&
          normalizePhrase(translatedText) === normalizePhrase(sourceText)
        ) {
          return response(400, {
            error: 'This phrase did not translate cleanly yet. Try a shorter request or use a saved example.',
          })
        }
      }
      const audio = await synthesizeSpeech(translatedText, targetLanguage)
      const guideText = buildPromptGuide({
        translatedText,
        translation: translation || (shouldTranslate ? sourceText : ''),
        languageLabel: targetLanguage.label,
        profile: syncedProfile,
      })
      const guideAudio = await buildGuideAudio({ guideText }, syncedProfile, targetLanguage)
      const articulationGuide = buildPromptArticulationGuide(translatedText, targetLanguage.code)
      const nextProfile = applyUsageStats(syncedProfile, {
        trainerPrompts: 1,
        totalTtsCalls: guideAudio ? 2 : 1,
      })
      await firestorePatch(profilePath, nextProfile, idToken)
      return response(200, {
        ...audio,
        ...(guideAudio || {}),
        text: translatedText,
        targetText: translatedText,
        sourceText,
        translation: translation || '',
        englishMeaning: translation || '',
        translated: shouldTranslate || Boolean(translationHint),
        sourceLanguageCode,
        languageLabel: targetLanguage.label,
        languageCode: targetLanguage.code,
        phonetic: syllabify(translatedText).join(' · '),
        coachNote: guideText,
        articulationGuide,
        profileSnapshot: nextProfile,
      })
    }

    // Trainer free-form: evaluate the user's recording against a typed phrase.
    if (payload.mode === 'freeform-eval') {
      const customText = String(payload.text || '').trim()
      const expectedPhrase = String(payload.expectedPhrase || customText).trim()
      if (!customText) {
        return response(400, { error: 'No phrase provided.' })
      }
      const minutesUsedToday = Number(syncedProfile.minutesUsedToday || 0)
      const dailyLimit = getDailyLimit(syncedProfile)
      if (minutesUsedToday >= dailyLimit) {
        return response(403, {
          error: 'You have reached your daily speaking limit.',
          profileSnapshot: syncedProfile,
        })
      }
      const targetLanguage =
        getLanguageByCode(payload.languageCode || syncedProfile.languageLearning) || lesson.language
      const audioBuffer = Buffer.from(payload.audioBase64 || '', 'base64')
      const transcript = await transcribeAudio(audioBuffer, payload.mimeType || 'audio/webm', targetLanguage)
      const analysis = analyzeUtterance({
        transcript,
        expectedPhrase,
        correctionIntensity: payload.correctionIntensity || syncedProfile.correctionIntensity,
      })
      const durationMinutes = Math.max(0.05, Number(((payload.durationMs || 0) / 60_000).toFixed(2)))
      const nextProfile = buildUpdatedProfile(syncedProfile, {
        accuracy: analysis.accuracy,
        durationMinutes,
        challengeCompleted: analysis.accuracy >= LESSON_PASS_THRESHOLD,
      })
      const trackedProfile = applyUsageStats(nextProfile, {
        totalMinutesUsed: durationMinutes,
        totalSttCalls: 1,
        trainerEvaluations: 1,
      })
      await firestorePatch(profilePath, trackedProfile, idToken)
      return response(200, {
        ...analysis,
        text: expectedPhrase,
        sourceText: customText,
        correctedPhrase: expectedPhrase,
        translation: customText !== expectedPhrase ? customText : '',
        translated: customText !== expectedPhrase,
        languageLabel: targetLanguage.label,
        languageCode: targetLanguage.code,
        profileSnapshot: trackedProfile,
      })
    }

    if (payload.mode === 'prompt') {
      const tutorTurn = buildOpeningTurn({
        lessonStep: currentStep,
        languageLabel: lesson.language.label,
        profile: syncedProfile,
        scenarioMeta: lesson.scenarioMeta,
      })
      const audio = await synthesizeSpeech(tutorTurn.speechText, lesson.language)
      const guideAudio = await buildGuideAudio(tutorTurn, syncedProfile, lesson.language)
      const nextProfile = applyUsageStats(syncedProfile, {
        totalTtsCalls: guideAudio ? 2 : 1,
      })

      await firestorePatch(profilePath, nextProfile, idToken)

      return response(200, {
        ...tutorTurn,
        ...audio,
        ...(guideAudio || {}),
        nextStepIndex: stepIndex,
        profileSnapshot: nextProfile,
      })
    }

    const minutesUsedToday = Number(syncedProfile.minutesUsedToday || 0)
    const dailyLimit = getDailyLimit(syncedProfile)
    if (minutesUsedToday >= dailyLimit) {
      if (JSON.stringify(profile) !== JSON.stringify(syncedProfile)) {
        await firestorePatch(profilePath, syncedProfile, idToken)
      }

      return response(403, {
        error: 'You have reached your daily speaking limit.',
        profileSnapshot: syncedProfile,
      })
    }

    const audioBuffer = Buffer.from(payload.audioBase64 || '', 'base64')
    const transcript = await transcribeAudio(audioBuffer, payload.mimeType || 'audio/webm', lesson.language)
    const analysis = analyzeUtterance({
      transcript,
      expectedPhrase: currentStep.expectedPhrase,
      correctionIntensity: payload.lesson?.correctionIntensity || syncedProfile.correctionIntensity,
    })

    const advanceRequested = shouldAdvanceLesson(transcript)
    const canAdvance = advanceRequested || analysis.accuracy >= LESSON_PASS_THRESHOLD
    const analysisForTurn = {
      ...analysis,
      passed: canAdvance,
    }
    const nextStepIndex = canAdvance ? (stepIndex + 1) % lesson.steps.length : stepIndex
    const nextStep = lesson.steps[nextStepIndex]
    const isLastStep =
      canAdvance && stepIndex === lesson.steps.length - 1 && nextStepIndex === 0
    const tutorTurn = buildTutorTurn({
      analysis: analysisForTurn,
      currentStep,
      nextStep,
      languageLabel: lesson.language.label,
      profile: syncedProfile,
      scenarioMeta: lesson.scenarioMeta,
      isLastStep,
    })
    if (advanceRequested) {
      tutorTurn.explanation = 'Moving on. You asked to go to the next line.'
      tutorTurn.comparisonNotes = 'Voice command accepted. Come back and clean the last phrase when you want to sharpen it.'
      tutorTurn.milestone = isLastStep
        ? `You moved through the final line. Revisit the earlier phrase if you want to polish it.`
        : 'Skipped ahead by request.'
    } else if (!canAdvance) {
      tutorTurn.milestone = `Stay on this line until you hit ${Math.round(LESSON_PASS_THRESHOLD * 100)}% or say “next one.”`
    }
    const audio = await synthesizeSpeech(tutorTurn.speechText, lesson.language)
    const guideAudio = await buildGuideAudio(tutorTurn, syncedProfile, lesson.language)

    const durationMinutes = Math.max(0.05, Number(((payload.durationMs || 0) / 60_000).toFixed(2)))
    const sessionEntry = {
      id: `${Date.now()}`,
      transcript: analysis.transcript,
      correctedPhrase: tutorTurn.correctedPhrase,
      explanation: tutorTurn.explanation,
      accuracy: analysis.accuracy,
      focus: currentStep.focus,
      coachMode: tutorTurn.coachMode,
      modeTitle: tutorTurn.modeTitle,
      wordFeedback: analysis.wordFeedback,
      visualGuide: tutorTurn.visualGuide,
      comparisonNotes: tutorTurn.comparisonNotes,
      nextMove: tutorTurn.nextMove,
      milestone: tutorTurn.milestone,
      scenarioLabel: tutorTurn.scenarioLabel,
      createdAt: new Date().toISOString(),
    }
    const nextProfile = {
      ...buildUpdatedProfile(syncedProfile, {
        accuracy: analysis.accuracy,
        durationMinutes,
        challengeCompleted: canAdvance,
        dailyChallengeCompleted: Boolean(String(lesson.scenarioMeta?.id || '').startsWith('daily-') && isLastStep),
      }),
      sessionHistory: [sessionEntry, ...(syncedProfile.sessionHistory || [])].slice(0, 25),
    }
    const trackedProfile = applyUsageStats(nextProfile, {
      totalMinutesUsed: durationMinutes,
      totalSttCalls: 1,
      totalTtsCalls: guideAudio ? 2 : 1,
      conversationTurns: 1,
      completedSessions: canAdvance && isLastStep ? 1 : 0,
    })

    await firestorePatch(profilePath, trackedProfile, idToken)

    return response(200, {
      ...tutorTurn,
      ...analysisForTurn,
      ...audio,
      ...(guideAudio || {}),
      nextStepIndex,
      profileSnapshot: trackedProfile,
      advanceRequested,
      passThreshold: LESSON_PASS_THRESHOLD,
    })
  } catch (error) {
    return response(500, {
      error: error.message || 'Voice processing failed.',
    })
  }
}
