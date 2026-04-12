function sentenceCase(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const LESSON_FALLBACKS = [
  {
    keywords: ['bathroom', 'washroom', 'restroom', 'toilet'],
    title: 'Ask where the bathroom is',
    goal: 'Find the bathroom politely and follow up if needed.',
    difficulty: 'beginner',
    phrases: [
      {
        english: 'Excuse me, where is the bathroom?',
        target: 'Excusez-moi, où sont les toilettes ?',
      },
      {
        english: 'Is it downstairs or upstairs?',
        target: "C'est en bas ou en haut ?",
      },
      {
        english: 'Thank you, I found it.',
        target: "Merci, je l'ai trouvé.",
      },
    ],
    pronunciationTips: [
      'Keep toilettes short and crisp. Do not turn it into an English twah-let.',
      'Let the question rise only on the final word.',
    ],
    coachLines: [
      'Lead with excuse me, then keep bathroom clear and calm.',
      'Do not rush the middle of the question.',
    ],
    ttsLines: [
      'Excusez-moi, où sont les toilettes ?',
      "C'est en bas ou en haut ?",
      "Merci, je l'ai trouvé.",
    ],
    challenge: 'Add a follow-up asking if there is a code for the door.',
  },
  {
    keywords: ['cafe', 'coffee', 'latte', 'espresso'],
    title: 'Order at a cafe',
    goal: 'Place a simple coffee order naturally.',
    difficulty: 'beginner',
    phrases: [
      {
        english: 'Hi, can I get a coffee with oat milk?',
        target: "Bonjour, je peux prendre un café avec du lait d'avoine ?",
      },
      {
        english: 'Can I have it iced?',
        target: 'Je peux le prendre glacé ?',
      },
      {
        english: 'That is all, thank you.',
        target: "C'est tout, merci.",
      },
    ],
    pronunciationTips: [
      'Keep café light on the second syllable.',
      'Do not over-pronounce the final t in lait.',
    ],
    coachLines: [
      'Say the drink in one flow, then land the milk choice clearly.',
      'Keep the question easy and conversational.',
    ],
    ttsLines: [
      "Bonjour, je peux prendre un café avec du lait d'avoine ?",
      'Je peux le prendre glacé ?',
      "C'est tout, merci.",
    ],
    challenge: 'Add a size or ask if they have something without dairy.',
  },
  {
    keywords: ['cab', 'taxi', 'uber', 'ride'],
    title: 'Ask for a cab',
    goal: 'Call a ride and confirm the destination.',
    difficulty: 'beginner',
    phrases: [
      {
        english: 'Could you call me a taxi, please?',
        target: "Vous pouvez m'appeler un taxi, s'il vous plaît ?",
      },
      {
        english: 'I need to go to the station.',
        target: "Je dois aller à la gare.",
      },
      {
        english: 'How long will it take?',
        target: 'Ça prendra combien de temps ?',
      },
    ],
    pronunciationTips: [
      'Keep taxi short and bright.',
      'Let gare land cleanly at the end.',
    ],
    coachLines: [
      'Make the request polite first, then state the destination clearly.',
    ],
    ttsLines: [
      "Vous pouvez m'appeler un taxi, s'il vous plaît ?",
      'Je dois aller à la gare.',
      'Ça prendra combien de temps ?',
    ],
    challenge: 'Add that you are in a hurry.',
  },
  {
    keywords: ['introduce myself', 'introduce me', 'my name is', 'meet someone', 'introduce'],
    title: 'Introduce yourself',
    goal: 'Say who you are naturally and keep the conversation moving.',
    difficulty: 'beginner',
    phrases: [
      {
        english: 'Hi, my name is Ali.',
        target: "Bonjour, je m'appelle Ali.",
      },
      {
        english: 'Nice to meet you.',
        target: 'Enchanté de vous rencontrer.',
      },
      {
        english: 'I am learning French right now.',
        target: "J'apprends le français en ce moment.",
      },
    ],
    pronunciationTips: [
      'Keep appelle short on the first syllable and light at the end.',
      'Let français stay smooth instead of breaking it into English beats.',
    ],
    coachLines: [
      'Start with your name cleanly, then land the greeting without rushing.',
      'Keep the second line warm and easy.',
    ],
    ttsLines: [
      "Bonjour, je m'appelle Ali.",
      'Enchanté de vous rencontrer.',
      "J'apprends le français en ce moment.",
    ],
    challenge: 'Add where you are from or why you are learning.',
  },
]

export function buildFallbackLesson({ request, targetLanguageLabel = 'French' }) {
  const normalized = String(request || '').toLowerCase()
  const preset =
    LESSON_FALLBACKS.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword))) ||
    null

  if (preset) {
    return {
      ...preset,
      _meta: {
        fallback: true,
        matched: true,
      },
    }
  }

  return {
    title: sentenceCase(String(request || '').trim()) || 'Custom speaking plan',
    goal: `A generated ${targetLanguageLabel} lesson is not available for this request in fallback mode.`,
    difficulty: 'unsupported',
    phrases: [],
    pronunciationTips: [],
    coachLines: [],
    ttsLines: [],
    challenge: '',
    _meta: {
      fallback: true,
      matched: false,
      unsupported: true,
    },
  }
}

export function buildFallbackDrill({ text, targetLanguageLabel = 'French' }) {
  const fallbackLesson = buildFallbackLesson({ request: text, targetLanguageLabel })
  if (fallbackLesson?._meta?.unsupported) {
    return fallbackLesson
  }
  return {
    title: fallbackLesson.title,
    goal: fallbackLesson.goal,
    difficulty: fallbackLesson.difficulty,
    phrases: fallbackLesson.phrases.slice(0, 1),
    pronunciationTips: fallbackLesson.pronunciationTips,
    coachLines: fallbackLesson.coachLines,
    ttsLines: fallbackLesson.ttsLines.slice(0, 1),
    challenge: fallbackLesson.challenge,
    _meta: fallbackLesson._meta,
  }
}

export function buildFallbackReview({ transcript, expectedPhrase }) {
  return {
    title: 'Pronunciation review',
    goal: 'Tighten the weak word before moving on.',
    difficulty: 'targeted',
    phrases: [
      {
        english: transcript || '',
        target: expectedPhrase || '',
      },
    ],
    pronunciationTips: [
      'Focus on the word that changed the sentence most.',
    ],
    coachLines: [
      'Repeat the corrected line once slowly, then once at natural speed.',
    ],
    ttsLines: [expectedPhrase || transcript || ''],
    challenge: 'Say it one more time without adding extra English stress.',
  }
}
