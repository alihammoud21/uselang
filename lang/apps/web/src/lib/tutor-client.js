import {
  generateWithNativeGemma,
  getNativeGemmaStatus,
  hasNativeGemmaBridge,
  loadNativeGemmaModel,
} from '@/lib/native-shell'

const LANG_LABELS = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  'fr-CA': 'Canadian French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-BR': 'Brazilian Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Mandarin Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  pl: 'Polish',
  ru: 'Russian',
}

const MODE_PLAYBOOKS = {
  'quick-ask':
    'MODE: Quick Ask. User asked how to say or pronounce something. Fill naturalPhrase, phonetic, one-line context if useful, one pronunciationTip, and a concrete articulation cue. Leave correctionLine empty.',
  train:
    'MODE: Train. If attemptTranscript is empty, teach one useful phrase and ask the user to repeat. If attemptTranscript is present, give one focused correction and set shouldRepeat=false only when clearly correct.',
  conversation:
    'MODE: Conversation. Stay in character for the scenario. localReply is the role response. naturalPhrase is a suggested user reply.',
  ocr:
    'MODE: OCR. If text is provided, explain it and suggest a natural response. Do not claim to inspect an image unless OCR text is included.',
  'live-camera':
    'MODE: Live Camera Coach. Coach only from the supplied text or expectedPhrase. Do not pretend to see the user.',
}

function labelFor(code) {
  if (!code) return 'the target language'
  return LANG_LABELS[code] || LANG_LABELS[String(code).slice(0, 2)] || code
}

function buildSystemPrompt(req) {
  const target = labelFor(req.languageCode)
  const native = labelFor(req.nativeLanguageCode || 'en')
  const modePlaybook = MODE_PLAYBOOKS[req.mode] || MODE_PLAYBOOKS['quick-ask']

  return [
    "You are Lang, a premium one-on-one speaking coach. You coach, you don't chat.",
    `The user speaks ${native} and is learning ${target}.`,
    'Rules: short coaching sentences. Never say you are an AI. One correction at a time. Translate like a local would actually say it.',
    'Phonetics: readable to a native speaker of the user language, not IPA. Capitalize stressed syllables.',
    modePlaybook,
    'Return ONLY one JSON object with these fields. Use empty strings or arrays for fields you do not need:',
    '{ "naturalPhrase": string, "phonetic": string, "literalMeaning": string, "context": string, "pronunciationTip": string, "articulation": { "tonguePlacement": string, "lipShape": string, "airflow": string, "stress": string }, "correctionLine": string, "repeatPrompt": string, "homework": string[], "localReply": string, "shouldRepeat": boolean, "audioText": string, "audioSegments": [{"lang": string, "text": string}] }',
  ].join('\n\n')
}

function buildUserTurn(req) {
  const lines = []
  if (req.text) lines.push(`User said: ${req.text}`)
  if (req.scenario) lines.push(`Scenario: ${req.scenario}`)
  if (req.attemptTranscript) lines.push(`Attempt transcript: ${req.attemptTranscript}`)
  if (req.expectedPhrase) lines.push(`Expected phrase: ${req.expectedPhrase}`)
  if (req.ocrText) lines.push(`OCR text: ${req.ocrText}`)
  if (req.sessionMemory) {
    const memory = []
    if (req.sessionMemory.currentPhrase) memory.push(`currentPhrase=${JSON.stringify(req.sessionMemory.currentPhrase)}`)
    if (req.sessionMemory.weakSounds?.length) memory.push(`weakSounds=${JSON.stringify(req.sessionMemory.weakSounds)}`)
    if (req.sessionMemory.mistakes?.length) memory.push(`mistakes=${JSON.stringify(req.sessionMemory.mistakes)}`)
    if (req.sessionMemory.understoodMeaning) memory.push('understoodMeaning=true')
    if (memory.length) lines.push(`Session memory: { ${memory.join(', ')} }`)
  }
  if (req.mode === 'ocr' && req.imageBase64 && !req.ocrText) {
    throw new Error('Camera image understanding needs local OCR before Gemma. Cloud OCR/LLM fallback is disabled.')
  }
  if (!lines.length) {
    lines.push(`Start a short ${labelFor(req.languageCode)} lesson. Introduce one useful phrase and ask the user to repeat.`)
  }
  return lines.join('\n')
}

function extractJson(text) {
  const raw = typeof text === 'string' ? text : ''
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fence ? fence[1] : raw
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Local Gemma did not return JSON.')
  }
  return JSON.parse(candidate.slice(first, last + 1))
}

function coerceTutorResponse(raw) {
  const stringValue = (value) => (typeof value === 'string' ? value : '')
  const stringArray = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [])
  const articulation = raw?.articulation && typeof raw.articulation === 'object' ? raw.articulation : {}
  const audioSegments = Array.isArray(raw?.audioSegments)
    ? raw.audioSegments
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({ lang: stringValue(item.lang), text: stringValue(item.text) }))
        .filter((item) => item.lang && item.text)
    : []
  const naturalPhrase = stringValue(raw?.naturalPhrase)

  return {
    naturalPhrase,
    phonetic: stringValue(raw?.phonetic),
    literalMeaning: stringValue(raw?.literalMeaning),
    context: stringValue(raw?.context),
    pronunciationTip: stringValue(raw?.pronunciationTip),
    articulation: {
      tonguePlacement: stringValue(articulation.tonguePlacement),
      lipShape: stringValue(articulation.lipShape),
      airflow: stringValue(articulation.airflow),
      stress: stringValue(articulation.stress),
    },
    correctionLine: stringValue(raw?.correctionLine),
    repeatPrompt: stringValue(raw?.repeatPrompt),
    homework: stringArray(raw?.homework).slice(0, 2),
    localReply: stringValue(raw?.localReply),
    shouldRepeat: raw?.shouldRepeat === true,
    audioText: stringValue(raw?.audioText) || naturalPhrase,
    audioSegments: audioSegments.length ? audioSegments : undefined,
    provider: 'gemma',
    providerModel: 'local-gemma',
  }
}

async function ensureNativeGemmaLoaded() {
  if (!hasNativeGemmaBridge()) {
    throw new Error('Local Gemma bridge is unavailable. Cloud tutor generation is disabled.')
  }

  const status = await getNativeGemmaStatus()
  if (status?.isLoaded) return
  if (status?.state !== 'ready') {
    throw new Error('Local Gemma model is not installed. Bundle Gemma with the app before using tutor responses.')
  }
  await loadNativeGemmaModel()
}

export async function postTutorSession(body) {
  await ensureNativeGemmaLoaded()

  const prompt = [
    buildSystemPrompt(body || {}),
    '',
    'USER TURN:',
    buildUserTurn(body || {}),
    '',
    'Respond with ONLY the JSON object.',
  ].join('\n')

  const result = await generateWithNativeGemma(prompt)
  const text = typeof result === 'string' ? result : result?.text || ''
  const parsed = result?.parsedJSON && Object.keys(result.parsedJSON).length ? result.parsedJSON : extractJson(text)
  return coerceTutorResponse(parsed)
}
