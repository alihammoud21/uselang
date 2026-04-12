import { getDailyChallengeBundle, getLessonBundle } from '@shared/lessons'
import { getLanguageByCode } from '@shared/languages'

function createLessonMeta({ id, title, tagline, estimatedMinutes = 1, difficulty = 'quick win' }) {
  return {
    id,
    title,
    tagline,
    completionSkill: title.toLowerCase(),
    completionLine: `You can now ${title.toLowerCase()}.`,
    estimatedMinutes,
    difficulty,
    totalSteps: 1,
    sourceScenario: title,
    requestText: title,
  }
}

export function createActiveSession(lesson, extras = {}) {
  return {
    kind: extras.kind || 'custom',
    request: extras.request || lesson?.scenarioMeta?.requestText || '',
    lesson,
    stepIndex: extras.stepIndex || 0,
    turn: extras.turn || null,
    startedAt: extras.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: extras.completedAt || '',
  }
}

export function createDailyChallengeSession(languageCode, goalId) {
  const lesson = getDailyChallengeBundle(languageCode, goalId)
  return createActiveSession(lesson, { kind: 'daily', request: lesson.scenarioMeta.title })
}

export function createQuickFixSession(profile, recentSession) {
  const language = getLanguageByCode(profile?.languageLearning || 'en')
  const correctedPhrase = recentSession?.correctedPhrase || recentSession?.visualGuide?.word || 'Say that one more time.'
  const translation = recentSession?.transcript || 'Quick pronunciation reset'
  const focus = recentSession?.visualGuide?.word || recentSession?.focus || 'weak sound'

  const lesson = {
    goal: { id: 'quick_fix', label: 'Quick fix' },
    language,
    scenarioMeta: createLessonMeta({
      id: 'quick-fix',
      title: `Quick fix · ${focus}`,
      tagline: 'One fast correction before you move on.',
    }),
    steps: [
      {
        id: 'quick-fix-line',
        index: 0,
        focus: `Fix ${focus}`,
        scenario: 'Repeat the clean line once slowly, then once naturally.',
        coachTip: recentSession?.comparisonNotes || 'Tighten the weak sound and keep the rest relaxed.',
        soundHint: recentSession?.visualGuide?.listenFor || 'Listen for a cleaner vowel and lighter English stress.',
        tonguePosition: recentSession?.visualGuide?.tonguePosition || 'Keep the tongue relaxed and close to the target sound.',
        lipShape: recentSession?.visualGuide?.lipShape || 'Do not over-shape the mouth like English.',
        airflow: recentSession?.visualGuide?.airflow || 'Use one steady breath through the phrase.',
        pronunciationDrill: recentSession?.visualGuide?.pronunciationDrill || correctedPhrase,
        challengePrompt: 'Lock this in once more at natural speed.',
        expectedPhrase: correctedPhrase,
        translation,
      },
    ],
  }

  return createActiveSession(lesson, { kind: 'quick_fix', request: focus })
}

export function createStarterSession(languageCode, goalId) {
  const lesson = getLessonBundle(languageCode, goalId)
  return createActiveSession(lesson, { kind: 'starter', request: lesson.scenarioMeta.title })
}
