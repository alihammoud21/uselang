function getLocalDateKey(date, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function isConsecutiveDay(previousDate, nextDate, timeZone) {
  const previous = new Date(previousDate)
  const next = new Date(nextDate)
  previous.setHours(0, 0, 0, 0)
  next.setHours(0, 0, 0, 0)
  const oneDay = 24 * 60 * 60 * 1000
  const previousKey = getLocalDateKey(previous, timeZone)
  const nextKey = getLocalDateKey(next, timeZone)
  if (previousKey === nextKey) return false
  return next.getTime() - previous.getTime() === oneDay
}

export function getLevelFromXp(xp = 0) {
  return Math.max(1, Math.floor(Number(xp || 0) / 120) + 1)
}

export function getChallengeScore(accuracy = 0) {
  if (accuracy >= 0.92) return 24
  if (accuracy >= 0.84) return 18
  if (accuracy >= 0.72) return 12
  return 8
}

export function applyPracticeProgress(profile = {}, options = {}) {
  const {
    accuracy = 0,
    challengeCompleted = false,
    dailyChallengeCompleted = false,
    durationMinutes = 0,
    now = new Date(),
  } = options

  const timeZone = profile.timezone || 'UTC'
  const todayKey = getLocalDateKey(now, timeZone)
  const lastPracticeDate = profile.lastPracticeDate || ''

  let streakCount = Number(profile.streakCount || 0)
  if (!lastPracticeDate) {
    streakCount = 1
  } else if (getLocalDateKey(new Date(lastPracticeDate), timeZone) === todayKey) {
    streakCount = Math.max(1, streakCount)
  } else if (isConsecutiveDay(lastPracticeDate, now, timeZone)) {
    streakCount += 1
  } else {
    streakCount = 1
  }

  const xpGain =
    getChallengeScore(accuracy) +
    (challengeCompleted ? 10 : 0) +
    (dailyChallengeCompleted ? 8 : 0) +
    Math.max(2, Math.round(Number(durationMinutes || 0) * 10))

  const nextXp = Number(profile.xp || 0) + xpGain
  const nextConfidence = Math.round(
    Math.max(25, Math.min(99, Number(profile.confidenceScore || 48) * 0.78 + accuracy * 100 * 0.22)),
  )

  return {
    ...profile,
    xp: nextXp,
    level: getLevelFromXp(nextXp),
    streakCount,
    longestStreak: Math.max(Number(profile.longestStreak || 0), streakCount),
    confidenceScore: nextConfidence,
    lastPracticeDate: now.toISOString(),
    lastPracticeAccuracy: Math.round(accuracy * 100),
    dailyChallengeCompletedAt: dailyChallengeCompleted ? now.toISOString() : profile.dailyChallengeCompletedAt || '',
  }
}
