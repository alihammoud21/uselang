export function extractJsonBlock(value = '') {
  const input = String(value || '').trim()
  if (!input) return {}

  try {
    return JSON.parse(input)
  } catch {
    // Try to recover the first JSON object from a text response.
  }

  const match = input.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('Model response did not contain valid JSON.')
  }
  return JSON.parse(match[0])
}
