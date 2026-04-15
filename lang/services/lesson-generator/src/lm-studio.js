import { buildMessages } from './prompts.js'
import { parseModelJson, validateLessonPayload } from './validate.js'

const DEFAULT_MODEL = 'gemma-3-4b-it'
const DEFAULT_URL = 'http://localhost:1234/v1/chat/completions'

async function requestLmStudio(kind, payload) {
  const response = await fetch(process.env.LM_STUDIO_BASE_URL || DEFAULT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LM_STUDIO_MODEL || DEFAULT_MODEL,
      messages: buildMessages(kind, payload),
      temperature: kind === 'review' ? 0.35 : 0.55,
      max_tokens: 300,
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error?.message || `LM Studio request failed with ${response.status}.`)
  }

  const rawContent = data?.choices?.[0]?.message?.content || ''
  return validateLessonPayload(parseModelJson(rawContent))
}

export async function generateWithRetry(kind, payload, fallbackFactory) {
  try {
    return await requestLmStudio(kind, payload)
  } catch (firstError) {
    try {
      return await requestLmStudio(kind, payload)
    } catch (secondError) {
      const fallback = fallbackFactory()
      return {
        ...fallback,
        _meta: {
          ...(fallback?._meta || {}),
          fallback: true,
          error: secondError.message || firstError.message,
        },
      }
    }
  }
}
