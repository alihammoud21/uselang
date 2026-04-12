function normalizeArray(values) {
  return Array.isArray(values) ? values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean) : []
}

export function parseModelJson(rawContent = '') {
  const text = String(rawContent || '').trim()
  if (!text) {
    throw new Error('Model returned empty content.')
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model response did not contain JSON.')
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1))
}

export function validateLessonPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Generator payload must be an object.')
  }

  const phrases = Array.isArray(payload.phrases)
    ? payload.phrases
        .map((phrase) => ({
          english: String(phrase?.english || '').trim(),
          target: String(phrase?.target || '').trim(),
        }))
        .filter((phrase) => phrase.english && phrase.target)
    : []

  if (!phrases.length) {
    throw new Error('Generator payload did not include usable phrases.')
  }

  return {
    title: String(payload.title || '').trim() || 'Custom speaking plan',
    goal: String(payload.goal || '').trim() || 'Practice a useful phrase naturally.',
    difficulty: String(payload.difficulty || '').trim() || 'beginner',
    phrases,
    pronunciationTips: normalizeArray(payload.pronunciationTips).slice(0, 4),
    coachLines: normalizeArray(payload.coachLines).slice(0, 4),
    ttsLines: normalizeArray(payload.ttsLines).slice(0, Math.max(phrases.length, 1)),
    challenge: String(payload.challenge || '').trim(),
  }
}
