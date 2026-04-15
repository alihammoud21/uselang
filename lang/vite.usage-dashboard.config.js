import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiProxyTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8788'

  return {
    plugins: [react(), tailwindcss()],
    root: path.resolve(__dirname, 'apps/usage-dashboard'),
    publicDir: path.resolve(__dirname, 'apps/web/public'),
    build: {
      outDir: path.resolve(__dirname, 'dist-usage-dashboard'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/web/src'),
        '@shared': path.resolve(__dirname, 'lib'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3002,
      strictPort: true,
      fs: {
        allow: [path.resolve(__dirname, 'apps/usage-dashboard'), path.resolve(__dirname, 'apps/web'), path.resolve(__dirname, 'lib')],
      },
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
