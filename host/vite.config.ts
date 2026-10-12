import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
    // Mirror the production Nginx routes while developing. Keeping the host's
    // remote URLs relative means the same federation configuration works in
    // Docker, locally, and through a Codespaces forwarded port.
    server: {
      proxy: {
        // Keep browser requests same-origin during local development. The
        // backend services use separate host ports because both default to
        // port 3000 inside their Docker containers.
        '/api/user': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/supplier': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/remotes/supplier': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          ws: true,
        },
        '/remotes/user': {
          target: 'http://localhost:5002',
          changeOrigin: true,
          ws: true,
        },
        '/remotes/errand': {
          target: 'http://localhost:5003',
          changeOrigin: true,
          ws: true,
        },
        '/remotes/credit': {
          target: 'http://localhost:5004',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: { target: 'esnext' },
    define: {
      'import.meta.env.AWS_ENDPOINT_URL': env.AWS_ENDPOINT_URL,
      'import.meta.env.COGNITO_CLIENT_ID': env.COGNITO_CLIENT_ID,
      'import.meta.env.COGNITO_USER_POOL_ID': env.COGNITO_USER_POOL_ID,
    },
  }
})
