// ── AI provider — DISABLED ──────────────────────────────────────────────────
// All AI generation is handled by on-device Gemma. The server does NOT run any
// cloud LLM (no Groq, no OpenAI, no Claude, no GPT, no fallback models).
// If this file is called, it is an error — the caller should be using Gemma.

export function getAiProvider() {
  throw new Error(
    'Cloud AI is disabled. All AI generation must use on-device Gemma. ' +
    'No cloud LLM (Groq, OpenAI, Claude, GPT) is permitted.'
  )
}

export function getVisionAiProvider() {
  throw new Error(
    'Vision AI is on-device only (Gemma). The server does not process images.'
  )
}

export function validateAiEnv() {
  return ['AI_PROVIDER (disabled — Gemma only)']
}
