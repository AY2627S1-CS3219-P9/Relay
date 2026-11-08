import express, { type ErrorRequestHandler } from 'express'
import { getEnv } from './config/env.js'
import { translateEstimationError } from './types/estimation.types.js'
import { createEstimationRouter, initializeAIClient } from './routes/estimation.routes.js'
import { internalServiceAuth } from './middleware/internal.middleware.js'
import { cleanupAIClient } from './clients/ai.client.js'

export async function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', redis: 'connected' })
  })

  // Initialize AI client once at startup
  const env = getEnv()
  await initializeAIClient(env)

  // Internal routes only (authenticated via service token)
  app.use('/internal/estimation', internalServiceAuth)
  app.use('/internal/estimation', createEstimationRouter())

  // Error handler
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const estimationError = translateEstimationError(err)
    res.status(estimationError.statusCode).json({
      code: estimationError.code,
      message: estimationError.fieldErrors
        ? `${estimationError.message} ${Object.entries(estimationError.fieldErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(' ')}`
        : estimationError.message,
    })
  }

  app.use(errorHandler)

  return { app, env }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { app, env } = await createApp()
  const port = env.port

  const server = app.listen(port, () => {
    console.log(`Credit estimation service listening on port ${port}`)
  })

  const shutdown = async () => {
    console.log('Shutting down...')
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err)
        else resolve(null)
      })
    })
    await cleanupAIClient()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
