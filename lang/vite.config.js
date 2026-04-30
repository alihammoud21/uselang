import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { handler as adminUsageHandler } from './netlify/functions/admin-usage.js'
import { handler as savePracticeHandler } from './netlify/functions/save-practice.js'
import { handler as tutorSessionHandler } from './netlify/functions/tutor-session.js'
import { handler as translateHandler } from './netlify/functions/translate.js'
import { handler as voiceSessionHandler } from './netlify/functions/voice-session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createViteNetlifyMiddleware(handler) {
  return async function viteNetlifyMiddleware(req, res) {
    try {
      const chunks = []
      await new Promise((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        req.on('end', resolve)
        req.on('error', reject)
      })

      const body = Buffer.concat(chunks).toString('utf8')
      const result = await handler({
        httpMethod: req.method,
        headers: req.headers,
        body,
        path: req.url?.split('?')[0] || '',
        rawUrl: req.url || '',
      })

      res.statusCode = result?.statusCode || 200
      Object.entries(result?.headers || {}).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value)
        }
      })
      res.end(result?.body || '')
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: error.message || 'Function execution failed.' }))
    }
  }
}

function spaFallbackPlugin() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      // Serve index.html for all non-asset, non-API routes (SPA fallback)
      server.middlewares.use((req, res, next) => {
        const url = req.url || '/'
        const isAsset = /\.(js|jsx|ts|tsx|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|json|map)(\?|$)/.test(url)
        const isApi = url.startsWith('/api/')
        const isVite = url.startsWith('/@')
        if (!isAsset && !isApi && !isVite && req.method === 'GET') {
          req.url = '/'
        }
        next()
      })
    },
  }
}

function localApiPlugin() {
  const voiceMiddleware = createViteNetlifyMiddleware(voiceSessionHandler)
  const savePracticeMiddleware = createViteNetlifyMiddleware(savePracticeHandler)
  const adminUsageMiddleware = createViteNetlifyMiddleware(adminUsageHandler)
  const tutorMiddleware = createViteNetlifyMiddleware(tutorSessionHandler)
  const translateMiddleware = createViteNetlifyMiddleware(translateHandler)

  return {
    name: 'local-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })
      server.middlewares.use('/api/voice-session', voiceMiddleware)
      server.middlewares.use('/api/tutor-session', tutorMiddleware)
      server.middlewares.use('/api/save-practice', savePracticeMiddleware)
      server.middlewares.use('/api/translate', translateMiddleware)
      server.middlewares.use('/api/admin-usage', adminUsageMiddleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)
  const apiProxyTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8788'
  const useEmbeddedApi = env.VITE_USE_EMBEDDED_API !== 'false'
  if (mode !== 'production' && useEmbeddedApi && !process.env.LANG_DEV_MODE) {
    process.env.LANG_DEV_MODE = '1'
  }

  return {
    appType: 'spa',
    plugins: [spaFallbackPlugin(), react(), tailwindcss(), useEmbeddedApi ? localApiPlugin() : null].filter(Boolean),
    root: path.resolve(__dirname, 'apps/web'),
    publicDir: path.resolve(__dirname, 'apps/web/public'),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/web/src'),
        '@shared': path.resolve(__dirname, 'lib'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT || env.VITE_PORT || 3002),
      strictPort: true,
      proxy: useEmbeddedApi
        ? undefined
        : {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
            },
          },
    },
  }
})
