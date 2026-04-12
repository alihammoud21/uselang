import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function netlifyFunctionsDevPlugin() {
  const functionFiles = {
    '/.netlify/functions/voice-session': path.resolve(__dirname, 'netlify/functions/voice-session.js'),
    '/.netlify/functions/save-practice': path.resolve(__dirname, 'netlify/functions/save-practice.js'),
  }

  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestPath = (req.url || '').split('?')[0]
        const filePath = functionFiles[requestPath]

        if (!filePath) {
          next()
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }

          const body = Buffer.concat(chunks).toString('utf8')
          const version = fs.statSync(filePath).mtimeMs
          const mod = await import(`${pathToFileURL(filePath).href}?v=${version}`)
          const result = await mod.handler({
            httpMethod: req.method,
            headers: req.headers,
            body,
            path: requestPath,
            rawUrl: req.url,
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
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), tailwindcss(), netlifyFunctionsDevPlugin()],
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
      port: 5173,
    },
  }
})
