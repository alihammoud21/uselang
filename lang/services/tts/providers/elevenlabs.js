import { assertEnv, optionalEnv } from '../../shared/env.js'

export function validateElevenLabsEnv(env = process.env) {
  assertEnv(['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'], env, 'ElevenLabs TTS')
}

export function createElevenLabsProvider(env = process.env) {
  validateElevenLabsEnv(env)
  const apiKey = env.ELEVENLABS_API_KEY
  const defaultVoiceId = env.ELEVENLABS_VOICE_ID
  const modelId = optionalEnv('ELEVENLABS_MODEL_ID', env, 'eleven_multilingual_v2')

  return {
    name: 'elevenlabs',
    async synthesize({ text, voiceId }) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId || defaultVoiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          model_id: modelId,
          text,
        }),
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(payload || 'ElevenLabs synthesis failed.')
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      return {
        audioBase64: audioBuffer.toString('base64'),
        audioMimeType: 'audio/mpeg',
      }
    },
  }
}
