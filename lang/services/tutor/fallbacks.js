import { syllabify, buildWordArticulationGuide } from '../../lib/tutor-engine.js'

function phonetic(text = '') {
  return syllabify(text).join(' · ') || text
}

export function buildTutorFallback({ text = '', mode = 'quick-ask', targetLanguageLabel = 'French' }) {
  const phrase = String(text || '').trim() || `Let's start with a short ${targetLanguageLabel} phrase.`
  const focusWord = phrase.split(/\s+/).find(Boolean) || phrase
  const articulation = buildWordArticulationGuide(focusWord)

  return {
    naturalPhrase: phrase,
    phonetic: phonetic(phrase),
    literalMeaning: '',
    context: mode === 'ocr' ? 'Tap the mic to try saying this out loud.' : '',
    pronunciationTip: articulation.listenFor || 'Keep the rhythm even.',
    articulation: {
      tonguePlacement: articulation.tonguePosition,
      lipShape: articulation.lipShape,
      airflow: articulation.airflow,
      stress: articulation.slowWord,
    },
    correctionLine: '',
    repeatPrompt: 'Now try it.',
    homework: [],
    localReply: '',
    shouldRepeat: true,
    audioText: phrase,
  }
}
