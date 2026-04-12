function baseSystemPrompt() {
  return [
    'You are a structured language coach for a voice-first app.',
    'Return ONLY valid JSON.',
    'No markdown.',
    'No explanations.',
    'No extra text.',
    'Keep phrases short, realistic, and useful in real life.',
    'Prefer native casual speech over textbook wording.',
    'Keep output concise.',
  ].join(' ')
}

export function buildLessonPrompt({ request, targetLanguageLabel, nativeLanguageLabel, confidenceLevel, tutorStyle }) {
  return [
    `Build a short speaking lesson in ${targetLanguageLabel}.`,
    `The learner speaks ${nativeLanguageLabel}.`,
    `The learner requested: "${request}".`,
    `Confidence level: ${confidenceLevel || 'beginner'}.`,
    `Tutor style: ${tutorStyle || 'balanced'}.`,
    'Return JSON with this exact shape:',
    '{"title":"","goal":"","difficulty":"","phrases":[{"english":"","target":""}],"pronunciationTips":[],"coachLines":[],"ttsLines":[],"challenge":""}',
    'Create 3 or 4 phrases that progress naturally from opening line to follow-up.',
    'Keep english as the learner guide language and target as the language they are learning.',
    'Make sure the target phrases actually match the request, not a generic travel lesson.',
  ].join(' ')
}

export function buildDrillPrompt({ text, targetLanguageLabel, nativeLanguageLabel, sayLikeLocal = false }) {
  return [
    `Translate and coach this phrase into ${targetLanguageLabel}.`,
    `The learner wrote it in ${nativeLanguageLabel}: "${text}".`,
    sayLikeLocal ? 'Prefer casual, local phrasing over textbook phrasing.' : 'Keep the phrasing natural and common.',
    'Return JSON with this exact shape:',
    '{"title":"","goal":"","difficulty":"","phrases":[{"english":"","target":""}],"pronunciationTips":[],"coachLines":[],"ttsLines":[],"challenge":""}',
    'Return exactly one main phrase in phrases.',
    'The english field should be the learner-facing gloss.',
    'The target field should be the exact phrase to pronounce.',
  ].join(' ')
}

export function buildReviewPrompt({ transcript, expectedPhrase, targetLanguageLabel, nativeLanguageLabel }) {
  return [
    `Review a pronunciation attempt in ${targetLanguageLabel}.`,
    `Learner guide language: ${nativeLanguageLabel}.`,
    `Expected phrase: "${expectedPhrase}".`,
    `Learner said: "${transcript}".`,
    'Return JSON with this exact shape:',
    '{"title":"","goal":"","difficulty":"","phrases":[{"english":"","target":""}],"pronunciationTips":[],"coachLines":[],"ttsLines":[],"challenge":""}',
    'Focus on one or two concrete pronunciation fixes, not generic praise.',
  ].join(' ')
}

export function buildMessages(kind, payload) {
  if (kind === 'lesson') {
    return [
      { role: 'system', content: baseSystemPrompt() },
      { role: 'user', content: buildLessonPrompt(payload) },
    ]
  }
  if (kind === 'review') {
    return [
      { role: 'system', content: baseSystemPrompt() },
      { role: 'user', content: buildReviewPrompt(payload) },
    ]
  }
  return [
    { role: 'system', content: baseSystemPrompt() },
    { role: 'user', content: buildDrillPrompt(payload) },
  ]
}
