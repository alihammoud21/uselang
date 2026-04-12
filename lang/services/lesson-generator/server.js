import express from 'express'
import { getLanguageByCode } from '../../lib/languages.js'
import { buildCacheKey, getCached, setCached } from './src/cache.js'
import { buildFallbackDrill, buildFallbackLesson, buildFallbackReview } from './src/fallbacks.js'
import { generateWithRetry } from './src/lm-studio.js'

const app = express()
const port = Number(process.env.LESSON_GENERATOR_PORT || 8787)

app.use(express.json({ limit: '1mb' }))

function logResult(kind, payload, result) {
  console.log(
    JSON.stringify({
      scope: 'lesson-generator',
      kind,
      request: payload?.request || payload?.text || '',
      fallback: Boolean(result?._meta?.fallback),
      title: result?.title || '',
      phraseCount: Array.isArray(result?.phrases) ? result.phrases.length : 0,
      timestamp: new Date().toISOString(),
    }),
  )
}

function withCache(prefix, payload, factory) {
  const key = buildCacheKey(prefix, payload)
  const cached = getCached(key)
  if (cached) return Promise.resolve(cached)
  return Promise.resolve(factory()).then((result) => setCached(key, result))
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/generate-lesson', async (req, res) => {
  const payload = req.body || {}
  const targetLanguage = getLanguageByCode(payload.targetLanguageCode || 'fr')
  const nativeLanguage = getLanguageByCode(payload.nativeLanguageCode || 'en')

  try {
    const result = await withCache('lesson', payload, () =>
      generateWithRetry(
        'lesson',
        {
          request: payload.request,
          targetLanguageLabel: targetLanguage.label,
          nativeLanguageLabel: nativeLanguage.label,
          confidenceLevel: payload.confidenceLevel,
          tutorStyle: payload.tutorStyle,
        },
        () => buildFallbackLesson({ request: payload.request, targetLanguageLabel: targetLanguage.label }),
      ),
    )

    logResult('lesson', payload, result)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to generate lesson.' })
  }
})

app.post('/generate-drill', async (req, res) => {
  const payload = req.body || {}
  const targetLanguage = getLanguageByCode(payload.targetLanguageCode || 'fr')
  const nativeLanguage = getLanguageByCode(payload.nativeLanguageCode || 'en')

  try {
    const result = await withCache('drill', payload, () =>
      generateWithRetry(
        'drill',
        {
          text: payload.text,
          targetLanguageLabel: targetLanguage.label,
          nativeLanguageLabel: nativeLanguage.label,
          sayLikeLocal: Boolean(payload.sayLikeLocal),
        },
        () => buildFallbackDrill({ text: payload.text, targetLanguageLabel: targetLanguage.label }),
      ),
    )

    logResult('drill', payload, result)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to generate drill.' })
  }
})

app.post('/generate-review', async (req, res) => {
  const payload = req.body || {}
  const targetLanguage = getLanguageByCode(payload.targetLanguageCode || 'fr')
  const nativeLanguage = getLanguageByCode(payload.nativeLanguageCode || 'en')

  try {
    const result = await withCache('review', payload, () =>
      generateWithRetry(
        'review',
        {
          transcript: payload.transcript,
          expectedPhrase: payload.expectedPhrase,
          targetLanguageLabel: targetLanguage.label,
          nativeLanguageLabel: nativeLanguage.label,
        },
        () =>
          buildFallbackReview({
            transcript: payload.transcript,
            expectedPhrase: payload.expectedPhrase,
          }),
      ),
    )

    logResult('review', payload, result)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to generate review.' })
  }
})

app.listen(port, () => {
  console.log(`UseLang lesson generator running on http://127.0.0.1:${port}`)
})
