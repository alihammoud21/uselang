import { readProvider } from '../shared/env.js'
import { createDeepgramTtsProvider, validateDeepgramTtsEnv } from './providers/deepgram.js'

function resolveProvider(env, override) {
  return readProvider(override || env.TTS_PROVIDER, 'deepgram')
}

export function getTextToSpeechService(env = process.env, override) {
  const provider = resolveProvider(env, override)
  if (provider === 'deepgram') return createDeepgramTtsProvider(env)
  throw new Error(`Unsupported TTS provider: ${provider}`)
}

export function validateTextToSpeechEnv(env = process.env, override) {
  const provider = resolveProvider(env, override)
  if (provider === 'deepgram') return validateDeepgramTtsEnv(env)
  throw new Error(`Unsupported TTS provider: ${provider}`)
}
