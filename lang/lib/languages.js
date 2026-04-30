export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    locale: 'en-US',
    sttCode: 'en-US',
    ttsModel: 'aura-2-arcas-en',
    tutorLabel: 'English',
  },
  {
    code: 'es',
    label: 'Spanish',
    locale: 'es-419',
    sttCode: 'es',
    ttsModel: 'aura-2-celeste-es',
    tutorLabel: 'Spanish',
  },
  {
    code: 'fr',
    label: 'French',
    locale: 'fr-FR',
    sttCode: 'fr',
    ttsModel: 'aura-2-agathe-fr',
    tutorLabel: 'French',
  },
  {
    code: 'de',
    label: 'German',
    locale: 'de-DE',
    sttCode: 'de',
    ttsModel: 'aura-2-viktoria-de',
    tutorLabel: 'German',
  },
  {
    code: 'it',
    label: 'Italian',
    locale: 'it-IT',
    sttCode: 'it',
    ttsModel: 'aura-2-livia-it',
    tutorLabel: 'Italian',
  },
  {
    code: 'ja',
    label: 'Japanese',
    locale: 'ja-JP',
    sttCode: 'ja',
    ttsModel: 'aura-2-izanami-ja',
    tutorLabel: 'Japanese',
  },
  {
    code: 'nl',
    label: 'Dutch',
    locale: 'nl-NL',
    sttCode: 'nl',
    ttsModel: 'aura-2-rhea-nl',
    tutorLabel: 'Dutch',
  },
  {
    code: 'zh',
    label: 'Mandarin',
    locale: 'zh-CN',
    sttCode: 'zh-CN',
    ttsModel: '',
    tutorLabel: 'Mandarin Chinese',
  },
  {
    code: 'hi',
    label: 'Hindi',
    locale: 'hi-IN',
    sttCode: 'hi',
    ttsModel: '',
    tutorLabel: 'Hindi',
  },
]

export const GOAL_OPTIONS = [
  { id: 'travel', label: 'Travel', detail: 'Handle airports, hotels, directions, and everyday movement without freezing.' },
  { id: 'work', label: 'Work', detail: 'Speak more clearly in meetings, introductions, and day-to-day collaboration.' },
  { id: 'family', label: 'Family', detail: 'Talk with relatives more naturally and stop switching back to English.' },
  { id: 'school', label: 'School', detail: 'Ask questions, follow explanations, and answer with more confidence.' },
  { id: 'general_interest', label: 'General interest', detail: 'Build real speaking comfort because you genuinely want the language to stick.' },
]

export const CONFIDENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', detail: 'You are just starting and want the tutor to keep phrases short and clear.' },
  { id: 'basics', label: 'Some basics', detail: 'You know a little already, but speaking still feels hesitant.' },
  { id: 'conversational', label: 'Conversational', detail: 'You can get through exchanges and want cleaner, more natural speech.' },
]

export const TUTOR_STYLE_OPTIONS = [
  { id: 'encouraging', label: 'Encouraging', detail: 'Warm, reassuring coaching that still keeps the lesson moving.' },
  { id: 'balanced', label: 'Balanced', detail: 'Clear feedback with a steady pace and direct corrections.' },
  { id: 'strict', label: 'Strict', detail: 'Higher standards, less padding, and faster movement to the next challenge.' },
]

export const CORRECTION_INTENSITY = [
  { id: 'light', label: 'Light', detail: 'Focus on major mistakes and keep flow high.' },
  { id: 'balanced', label: 'Balanced', detail: 'Correct important words while keeping momentum.' },
  { id: 'strict', label: 'Strict', detail: 'Push for clean pronunciation and exact phrasing.' },
]

const LEGACY_GOAL_MAP = {
  study: 'school',
  life: 'general_interest',
}

export function getLanguageByCode(code) {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code) ?? SUPPORTED_LANGUAGES[0]
}

export function getGoalById(goalId) {
  const normalizedGoal = LEGACY_GOAL_MAP[goalId] || goalId
  return GOAL_OPTIONS.find((goal) => goal.id === normalizedGoal) ?? GOAL_OPTIONS[0]
}

export function getConfidenceById(confidenceId) {
  return CONFIDENCE_LEVELS.find((item) => item.id === confidenceId) ?? CONFIDENCE_LEVELS[0]
}

export function getTutorStyleById(styleId) {
  return TUTOR_STYLE_OPTIONS.find((item) => item.id === styleId) ?? TUTOR_STYLE_OPTIONS[1]
}

export function isTrialActive(profile, now = new Date()) {
  if (!profile?.trialActive) {
    return false
  }

  const createdAt = profile?.createdAt ? new Date(profile.createdAt) : now

  return now.getTime() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
}

export function getDailyLimit(profile, now = new Date()) {
  if (profile?.plan === 'pro') {
    return 30
  }
  if (profile?.plan === 'starter') {
    return 15
  }
  // base plan: 2 min/day, 10 min/day during free trial week
  return isTrialActive(profile, now) ? 10 : 2
}

/** Whether this profile has offline Deepgram TTS access (Pro only) */
export function hasOfflineDeepgram(profile) {
  return profile?.plan === 'pro'
}

export function getMinutesRemaining(profile, now = new Date()) {
  const limit = getDailyLimit(profile, now)
  const used = Number(profile?.minutesUsedToday ?? 0)
  return Math.max(0, Number((limit - used).toFixed(2)))
}

export function formatUsageLabel(profile, now = new Date()) {
  const remaining = getMinutesRemaining(profile, now)
  return `${remaining.toFixed(1)} min left today`
}
