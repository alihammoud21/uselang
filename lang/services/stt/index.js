import { readProvider } from '../shared/env.js'
import { createDeepgramSttProvider, validateDeepgramSttEnv } from './providers/deepgram.js'
import { createXfyunSttProvider, validateXfyunSttEnv } from './providers/xfyun.js'

function resolveProvider(env = process.env, override) {
  return readProvider(override || env.STT_PROVIDER, 'deepgram')
}

export function getSpeechToTextService(env = process.env, override) {
  const provider = resolveProvider(env, override)
  if (provider === 'deepgram') return createDeepgramSttProvider(env)
  if (provider === 'xfyun') return createXfyunSttProvider(env)
  throw new Error(`Unsupported STT provider: ${provider}`)
}

export function validateSpeechToTextEnv(env = process.env, override) {
  const provider = resolveProvider(env, override)
  if (provider === 'deepgram') return validateDeepgramSttEnv(env)
  if (provider === 'xfyun') return validateXfyunSttEnv(env)
  throw new Error(`Unsupported STT provider: ${provider}`)
}
