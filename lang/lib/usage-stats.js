const NUMERIC_KEYS = [
  'totalMinutesUsed',
  'totalSttCalls',
  'totalTtsCalls',
  'customPlanBuilds',
  'trainerPrompts',
  'trainerEvaluations',
  'conversationTurns',
  'downloadsSaved',
  'completedSessions',
]

export function createDefaultUsageStats() {
  return {
    totalMinutesUsed: 0,
    totalSttCalls: 0,
    totalTtsCalls: 0,
    customPlanBuilds: 0,
    trainerPrompts: 0,
    trainerEvaluations: 0,
    conversationTurns: 0,
    downloadsSaved: 0,
    completedSessions: 0,
    lastActivityAt: '',
  }
}

export function mergeUsageStats(current = {}, delta = {}, now = new Date()) {
  const next = {
    ...createDefaultUsageStats(),
    ...(current || {}),
  }

  NUMERIC_KEYS.forEach((key) => {
    next[key] = Number(next[key] || 0) + Number(delta[key] || 0)
  })

  next.lastActivityAt =
    delta.lastActivityAt ||
    next.lastActivityAt ||
    now.toISOString()

  return next
}
