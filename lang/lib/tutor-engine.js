// Tutor engine — builds specific, non-repetitive coaching turns.
// The engine has five modes: teach, repeat-after-me, correct, challenge, simulate.
// Every reply references the user's actual words so it never sounds generic.

const WORD_THRESHOLD = {
  light: { close: 0.55, pass: 0.62 },
  balanced: { close: 0.7, pass: 0.76 },
  strict: { close: 0.82, pass: 0.88 },
}

const STYLE_TONE = {
  encouraging: {
    opener: [
      'Let us start warm and calm.',
      'Take a slow breath first.',
      'We will build this phrase together.',
      'One sentence at a time, no rush.',
    ],
    cleanPass: [
      'That landed cleanly.',
      'Very nice — it sounded natural.',
      'That one was smooth.',
      'Beautiful, that is the shape we wanted.',
    ],
    refine: [
      'The meaning is there, now let us tighten the sound.',
      'Almost there. One small polish and it is locked in.',
      'Very close — just one tweak.',
    ],
    correct: [
      'Stay with it — one specific fix coming up.',
      'Good attempt. Here is what to adjust.',
      'Do not worry, the weak spot is tiny.',
    ],
    reset: [
      'I could not hear a full phrase yet. Try again a little louder.',
      'Let us restart the line calmly.',
      'No problem — speak a touch louder this time.',
    ],
  },
  balanced: {
    opener: [
      'Start with the exact line.',
      'Say it the way you would in real life.',
      'Keep the rhythm steady and begin.',
      'Lead with a clean version of the sentence.',
    ],
    cleanPass: [
      'Clean pass.',
      'That version is ready to use.',
      'Good — the phrase is yours now.',
      'Locked in.',
    ],
    refine: [
      'The idea is clear; now sharpen the delivery.',
      'Good enough to move on, but I want it cleaner.',
      'The sentence works. Tighten the weak syllable.',
    ],
    correct: [
      'The phrase drifted in one specific spot.',
      'The meaning broke on one word — we fix it now.',
      'Let us correct the part that changed the sentence.',
    ],
    reset: [
      'No clean transcript captured. Try again closer to the mic.',
      'That was not enough audio to coach. One more take.',
      'Reset and say the full line once.',
    ],
  },
  strict: {
    opener: [
      'Say the phrase cleanly the first time.',
      'Deliver the line in one controlled breath.',
      'Start sharp, no hesitations.',
      'Keep the pace tight from the first word.',
    ],
    cleanPass: [
      'Clean. Move forward.',
      'Accepted. Next line.',
      'That is the standard — keep it.',
    ],
    refine: [
      'Passable, but the sound is not finished.',
      'Meaning clear, delivery sloppy. Tighten it.',
      'Not polished yet — we sharpen before advancing.',
    ],
    correct: [
      'The sentence missed its target.',
      'That version changed the meaning.',
      'The weak word broke the phrase.',
    ],
    reset: [
      'No usable audio. Try again with more volume.',
      'Unclear take. Deliver the line properly.',
      'That was not workable. Once more, steady.',
    ],
  },
}

const COACH_MODES = {
  teach: 'teach',
  repeat: 'repeat-after-me',
  correct: 'correct',
  challenge: 'challenge',
  simulate: 'simulate',
}

function seedFrom(...values) {
  const joined = values.join('|')
  let hash = 0
  for (let index = 0; index < joined.length; index += 1) {
    hash = (hash * 31 + joined.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function pickVariant(list, seed) {
  if (!list || !list.length) return ''
  return list[seed % list.length]
}

function normalizeTutorStyle(profile = {}) {
  if (profile.tutorStyle && STYLE_TONE[profile.tutorStyle]) {
    return profile.tutorStyle
  }
  if (profile.correctionIntensity === 'strict') return 'strict'
  if (profile.correctionIntensity === 'light') return 'encouraging'
  return 'balanced'
}

export function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function splitWords(value = '') {
  const normalized = normalizeText(value)
  return normalized ? normalized.split(' ') : []
}

function levenshtein(left = '', right = '') {
  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }
  return matrix[left.length][right.length]
}

function similarityScore(left = '', right = '') {
  if (!left || !right) return 0
  const distance = levenshtein(left, right)
  return 1 - distance / Math.max(left.length, right.length)
}

const SYLLABLE_REGEX = /[aeiouyáéíóúàèìòùâêîôûäëïöüãõåæœ]+[^aeiouyáéíóúàèìòùâêîôûäëïöüãõåæœ]*/gi

export function syllabify(word = '') {
  const cleaned = (word || '').trim()
  if (!cleaned) return []
  const matches = cleaned.match(SYLLABLE_REGEX)
  if (matches && matches.length > 0) return matches
  // Fallback — chunk by 2
  const chunks = []
  let cursor = 0
  while (cursor < cleaned.length) {
    chunks.push(cleaned.slice(cursor, cursor + 2))
    cursor += 2
  }
  return chunks
}

function phoneticCue(word = '') {
  return syllabify(word).join(' · ') || word
}

export function buildWordArticulationGuide(word = '', fallback = {}) {
  const normalized = normalizeText(word)
  const syllables = syllabify(word)
  const raw = String(word || '').trim()

  if (!normalized) {
    return {
      tonguePosition: fallback.tonguePosition || 'Rest the tongue lightly behind the top teeth.',
      lipShape: fallback.lipShape || 'Lips relaxed, slightly open, no tension in the jaw.',
      airflow: fallback.airflow || 'Let the air move steadily — do not clip the end of the word.',
      slowWord: syllables.join(' | ') || phoneticCue(word),
      diagramMode: 'neutral',
      listenFor: 'A clean release with no extra English stress.',
      commonMistake: 'Do not add an extra vowel at the end.',
    }
  }

  if (/[\u3400-\u9fff]/.test(word)) {
    return {
      tonguePosition: 'Keep the tongue relaxed and precise. Move it cleanly between sounds instead of pressing into the teeth.',
      lipShape: 'Keep the lips controlled and light. Round only if the vowel clearly asks for it.',
      airflow: 'Push a short, clean stream of air for each syllable and keep the tone steady all the way through.',
      slowWord: syllables.join(' | '),
      diagramMode: 'mandarin',
      listenFor: 'Even syllables with steady tone, not a heavy English stress pattern.',
      commonMistake: 'Do not stretch one syllable and swallow the next.',
    }
  }

  if (/(?:ait|ais|ei|è|ê|et|est|er|ez)$/i.test(raw)) {
    return {
      tonguePosition: 'Keep the tongue flat and slightly forward for a short French eh sound. The tip stays low until the word releases.',
      lipShape: 'Keep the mouth only slightly open and relaxed. Do not spread wide like an English A.',
      airflow: 'Let the word end softly. If the final consonant is silent, stop the air cleanly without adding an extra T or Z.',
      slowWord: syllables.join(' | '),
      diagramMode: 'front',
      listenFor: 'A short eh sound, not an English ay.',
      commonMistake: 'English speakers often pronounce the final T or turn the vowel into ay.',
    }
  }

  if (/(?:ait|eau|eux|ou|on|an|en|in|er|ez|oi|ç|é|è|ê|à|ù|œ)/i.test(word)) {
    return {
      tonguePosition: /r/.test(normalized)
        ? 'Keep the tongue low and slightly back. Do not tap the roof of the mouth for the French R.'
        : 'Keep the front of the tongue light and low-mid. Do not force the vowel into a heavy English sound.',
      lipShape: /(?:ou|eau|eu|œ|o)/.test(normalized)
        ? 'Round the lips gently and keep the circle small.'
        : 'Keep the lips relaxed and only slightly spread.',
      airflow: /(?:an|en|on|in|un)/.test(normalized)
        ? 'Let some air escape through the nose and avoid a hard final N.'
        : 'Keep the airflow soft and even. Do not punch the ending like English.',
      slowWord: syllables.join(' | '),
      diagramMode: /(?:an|en|on|in|un)/.test(normalized) ? 'nasal' : /(?:ou|eau|eu|œ|o)/.test(normalized) ? 'rounded' : /r/.test(normalized) ? 'uvular' : 'front',
      listenFor: /(?:an|en|on|in|un)/.test(normalized)
        ? 'A soft nasal resonance instead of a spoken final N.'
        : /r/.test(normalized)
          ? 'A back-of-throat French R instead of an English tongue tap.'
          : 'A cleaner, flatter French vowel instead of an English glide.',
      commonMistake: /(?:an|en|on|in|un)/.test(normalized)
        ? 'Do not fully pronounce the final N.'
        : /r/.test(normalized)
          ? 'Do not curl the tongue like an English R.'
          : 'Do not add extra English movement to the vowel.',
    }
  }

  if (/(?:rr|ll|ñ|á|é|í|ó|ú)/i.test(word)) {
    return {
      tonguePosition: /rr|r/.test(normalized)
        ? 'Bring the tongue tip close to the ridge behind the top teeth. Use a light tap instead of a heavy stop.'
        : 'Keep the tongue forward and relaxed so the vowels stay bright and clean.',
      lipShape: 'Keep the lips neutral and open just enough for each vowel.',
      airflow: 'Use a smooth, steady stream of air so every syllable stays equally clear.',
      slowWord: syllables.join(' | '),
      diagramMode: /rr|r/.test(normalized) ? 'alveolar' : 'front',
      listenFor: /rr|r/.test(normalized)
        ? 'A light tap or trill, not a heavy English R.'
        : 'Short, bright vowels with no swallowed middle syllable.',
      commonMistake: /rr|r/.test(normalized)
        ? 'Do not pull the tongue back into an English R.'
        : 'Do not reduce the unstressed vowels.',
    }
  }

  return {
    tonguePosition: 'Put the tongue tip just behind the upper teeth, then release lightly into the vowel.',
    lipShape: 'Keep the lips soft and let the jaw stay loose.',
    airflow: 'Use one smooth stream of air and finish the word cleanly.',
    slowWord: syllables.join(' | '),
    diagramMode: 'alveolar',
    listenFor: 'A clean beginning and ending, with no extra vowel added.',
    commonMistake: 'Do not drag the word out or add a second beat that is not there.',
  }
}

function listWords(words = []) {
  if (!words.length) return ''
  if (words.length === 1) return `"${words[0]}"`
  if (words.length === 2) return `"${words[0]}" and "${words[1]}"`
  return `${words.slice(0, -1).map((word) => `"${word}"`).join(', ')}, and "${words[words.length - 1]}"`
}

export function analyzeUtterance({ transcript, expectedPhrase, correctionIntensity = 'balanced' }) {
  const expectedWords = splitWords(expectedPhrase)
  const spokenWords = splitWords(transcript)
  const thresholds = WORD_THRESHOLD[correctionIntensity] ?? WORD_THRESHOLD.balanced

  // Two-pass alignment: first try index-to-index, then try to recover shifted words.
  const wordFeedback = expectedWords.map((expectedWord, index) => {
    // Try the index match, then look ±1 for a better match (handles missing/extra words).
    const candidates = [
      spokenWords[index],
      spokenWords[index - 1],
      spokenWords[index + 1],
    ].filter(Boolean)

    let bestSpoken = spokenWords[index] ?? ''
    let bestScore = bestSpoken ? similarityScore(expectedWord, bestSpoken) : 0

    for (const candidate of candidates) {
      const score = similarityScore(expectedWord, candidate)
      if (score > bestScore) {
        bestScore = score
        bestSpoken = candidate
      }
    }

    const status =
      bestSpoken === expectedWord
        ? 'correct'
        : bestScore >= thresholds.close
          ? 'close'
          : 'incorrect'

    return {
      expectedWord,
      spokenWord: bestSpoken,
      score: Number(bestScore.toFixed(2)),
      status,
    }
  })

  const totalScore = wordFeedback.reduce((sum, word) => sum + word.score, 0)
  const accuracy = expectedWords.length ? totalScore / expectedWords.length : 0
  const incorrectWords = wordFeedback.filter((word) => word.status === 'incorrect').map((word) => word.expectedWord)
  const closeWords = wordFeedback.filter((word) => word.status === 'close').map((word) => word.expectedWord)
  const correctCount = wordFeedback.filter((word) => word.status === 'correct').length
  const passed = Boolean(spokenWords.length) && accuracy >= thresholds.pass

  return {
    transcript: transcript?.trim() ?? '',
    correctedPhrase: expectedPhrase,
    wordFeedback,
    accuracy: Number(accuracy.toFixed(2)),
    passed,
    missedWords: incorrectWords,
    closeWords,
    correctCount,
  }
}

function buildPronunciationFocus(analysis, lessonStep) {
  const ranked = [...(analysis.wordFeedback || [])]
    .filter((entry) => entry.status !== 'correct')
    .sort((left, right) => left.score - right.score)

  const focusWord =
    ranked[0]?.expectedWord ||
    (analysis.closeWords || [])[0] ||
    splitWords(lessonStep.expectedPhrase)[0] ||
    ''

  const syllables = syllabify(focusWord)
  const articulationGuide = buildWordArticulationGuide(focusWord, lessonStep)

  return {
    word: focusWord,
    phonetic: phoneticCue(focusWord),
    syllables,
    slowWord: articulationGuide.slowWord,
    tonguePosition: articulationGuide.tonguePosition,
    lipShape: articulationGuide.lipShape,
    airflow: articulationGuide.airflow,
    diagramMode: articulationGuide.diagramMode,
    commonMistake: articulationGuide.commonMistake,
    listenFor: articulationGuide.listenFor || lessonStep.coachTip,
    soundHint: lessonStep.soundHint || `Slow "${focusWord}" down and keep every beat clear.`,
    drill: lessonStep.pronunciationDrill || `Say "${focusWord}" twice, then the full phrase once.`,
  }
}

function buildSpecificExplanation({ analysis, currentStep, tone, seed, visualGuide }) {
  // Prefer specific word-level feedback first, fall back to general tone.
  const worst = [...(analysis.wordFeedback || [])]
    .filter((entry) => entry.status !== 'correct')
    .sort((left, right) => left.score - right.score)[0]

  if (!analysis.transcript) {
    return `${pickVariant(tone.reset, seed)} ${currentStep.coachTip}`
  }

  if (!worst) {
    return `${pickVariant(tone.cleanPass, seed)} The rhythm held all the way through.`
  }

  // Highly specific: "You said 'cafe', but it should be 'café' with a stronger é sound."
  const saidWord = worst.spokenWord || 'something else'
  const expectedWord = worst.expectedWord
  const syllables = syllabify(expectedWord).join('—')

  const openers = tone.correct
  const correctionOpener = pickVariant(openers, seed)
  const articulationCue = visualGuide.word
    ? `Pay attention to the mouth shape on "${visualGuide.word}".`
    : ''
  const extraCue = visualGuide.commonMistake ? `Avoid this English habit: ${visualGuide.commonMistake}` : ''

  if (worst.status === 'close') {
    const refineOpener = pickVariant(tone.refine, seed + 1)
    return `${refineOpener} You said "${saidWord}" — close, but the target is "${expectedWord}" (${syllables}). ${visualGuide.soundHint} ${extraCue} ${articulationCue}`.trim()
  }

  return `${correctionOpener} You said "${saidWord}" instead of "${expectedWord}" (${syllables}). ${visualGuide.soundHint} ${extraCue} ${articulationCue}`.trim()
}

function chooseCoachMode(analysis) {
  if (!analysis.transcript) return COACH_MODES.repeat
  if (!analysis.passed) {
    if ((analysis.missedWords || []).length >= Math.max(1, Math.floor((analysis.wordFeedback?.length || 0) / 2))) {
      return COACH_MODES.repeat
    }
    return COACH_MODES.correct
  }
  if (analysis.accuracy < 0.92) return COACH_MODES.challenge
  return COACH_MODES.simulate
}

const MODE_TITLES = {
  [COACH_MODES.teach]: 'Learn the phrase',
  [COACH_MODES.repeat]: 'Repeat after me',
  [COACH_MODES.correct]: 'Fix the weak word',
  [COACH_MODES.challenge]: 'Sharpen the delivery',
  [COACH_MODES.simulate]: 'Keep the conversation going',
}

export function buildOpeningTurn({ lessonStep, languageLabel, profile = {}, scenarioMeta }) {
  const tutorStyle = normalizeTutorStyle(profile)
  const tone = STYLE_TONE[tutorStyle] ?? STYLE_TONE.balanced
  const seed = seedFrom(lessonStep.id, lessonStep.expectedPhrase, profile.email || '')
  const opener = pickVariant(tone.opener, seed)
  const visualGuide = buildPronunciationFocus({ wordFeedback: [] }, lessonStep)

  const beginnerCue = profile.confidenceLevel === 'conversational' ? 'Say it naturally:' : 'Say:'
  const teachBody = `${lessonStep.scenario} ${opener}`
  const guideText = `${teachBody} ${profile.confidenceLevel === 'conversational' ? 'Then say this naturally.' : 'Then say this.'}`

  return {
    coachMode: COACH_MODES.teach,
    modeTitle: MODE_TITLES[COACH_MODES.teach],
    explanation: teachBody,
    correctedPhrase: lessonStep.expectedPhrase,
    promptText: `${beginnerCue} ${lessonStep.expectedPhrase}`,
    guideText,
    speechText: lessonStep.expectedPhrase,
    languageLabel,
    scenarioLabel: lessonStep.focus,
    scenarioMeta: scenarioMeta || null,
    visualGuide,
    comparisonNotes: `This is a ${lessonStep.focus.toLowerCase()} phrase in ${languageLabel}. Focus on "${visualGuide.word}".`,
    nextMove: lessonStep.challengePrompt,
    milestone: '',
    wordFeedback: [],
    accuracy: null,
  }
}

export function buildTutorTurn({
  analysis,
  currentStep,
  nextStep,
  languageLabel,
  profile = {},
  scenarioMeta,
  isLastStep = false,
}) {
  const tutorStyle = normalizeTutorStyle(profile)
  const tone = STYLE_TONE[tutorStyle] ?? STYLE_TONE.balanced
  const coachMode = chooseCoachMode(analysis)
  const visualGuide = buildPronunciationFocus(analysis, currentStep)
  const seed = seedFrom(analysis.transcript || '', currentStep.id, analysis.accuracy)

  const explanation = buildSpecificExplanation({ analysis, currentStep, tone, seed, visualGuide })
  let promptText = ''
  let milestone = ''
  let nextMove = currentStep.challengePrompt
  const modeTitle = MODE_TITLES[coachMode]

  if (coachMode === COACH_MODES.repeat) {
    promptText = `Repeat after me: ${currentStep.expectedPhrase}`
  } else if (coachMode === COACH_MODES.correct) {
    promptText = `Try again, and focus on "${visualGuide.word}": ${currentStep.expectedPhrase}`
  } else if (coachMode === COACH_MODES.challenge) {
    promptText = profile.confidenceLevel === 'conversational'
      ? `Use this next: ${nextStep.expectedPhrase}`
      : `Now say: ${nextStep.expectedPhrase}`
    milestone = `Good. "${visualGuide.word}" still needs one more clean pass before it is automatic.`
    nextMove = nextStep.challengePrompt
  } else {
    // simulate / advance
    promptText = profile.confidenceLevel === 'conversational'
      ? `Answer with: ${nextStep.expectedPhrase}`
      : `Next line: ${nextStep.expectedPhrase}`
    milestone = isLastStep
      ? `You can now ${scenarioMeta?.completionSkill || currentStep.focus.toLowerCase()} in ${languageLabel}.`
      : 'That phrase is locked in. Moving the scenario forward.'
    nextMove = nextStep.challengePrompt
  }

  const comparisonNotes = analysis.transcript
    ? (analysis.missedWords.length
        ? `The phrase drifted on ${listWords(analysis.missedWords.slice(0, 3))}.`
        : `Your version matched the shape of "${currentStep.expectedPhrase}".`)
    : 'No clean speech was captured. Say the full line once, steady.'

  const targetSpeechText =
    coachMode === COACH_MODES.challenge || coachMode === COACH_MODES.simulate
      ? nextStep.expectedPhrase
      : currentStep.expectedPhrase

  const guideText =
    coachMode === COACH_MODES.repeat
      ? `${explanation} Listen once, then repeat the line.`
      : coachMode === COACH_MODES.correct
        ? `${explanation} Focus on ${visualGuide.word}, then try it again.`
        : coachMode === COACH_MODES.challenge
          ? `${explanation} Good enough to move on. Listen, then say the next line.`
          : `${explanation} Listen, then answer with the next line.`

  return {
    coachMode,
    modeTitle,
    explanation,
    correctedPhrase: currentStep.expectedPhrase,
    promptText,
    guideText,
    speechText: targetSpeechText,
    languageLabel,
    scenarioLabel: currentStep.focus,
    scenarioMeta: scenarioMeta || null,
    visualGuide,
    comparisonNotes,
    nextMove,
    milestone,
    wordFeedback: analysis.wordFeedback,
    accuracy: analysis.accuracy,
    transcript: analysis.transcript,
  }
}
