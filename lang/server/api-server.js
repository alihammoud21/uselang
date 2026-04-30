import express from 'express'
import { handler as adminUsageHandler } from '../netlify/functions/admin-usage.js'
import { handler as healthHandler } from '../netlify/functions/health.js'
import { handler as savePracticeHandler } from '../netlify/functions/save-practice.js'
import { handler as sttHandler } from '../netlify/functions/stt.js'
import { handler as tutorSessionHandler } from '../netlify/functions/tutor-session.js'
import { handler as translateHandler } from '../netlify/functions/translate.js'
import { handler as voiceSessionHandler } from '../netlify/functions/voice-session.js'
import { createNetlifyHandlerRoute } from './netlify-adapter.js'

const app = express()
const host = process.env.API_HOST || '127.0.0.1'
const port = Number(process.env.API_PORT || 8788)

app.disable('x-powered-by')
app.use(express.text({ type: '*/*', limit: '25mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.all('/api/health', createNetlifyHandlerRoute(healthHandler))
app.all('/api/voice-session', createNetlifyHandlerRoute(voiceSessionHandler))
app.all('/api/tutor-session', createNetlifyHandlerRoute(tutorSessionHandler))
app.all('/api/stt', createNetlifyHandlerRoute(sttHandler))
app.all('/api/save-practice', createNetlifyHandlerRoute(savePracticeHandler))
app.all('/api/translate', createNetlifyHandlerRoute(translateHandler))
app.all('/api/admin-usage', createNetlifyHandlerRoute(adminUsageHandler))

app.listen(port, host, () => {
  console.log(`UseLang API ready on http://${host}:${port}`)
})
