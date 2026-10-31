import express, { type ErrorRequestHandler } from 'express'
import { getEnv } from './config/env.js'
import { translateEstimationError } from './types/estimation.types.js'
import { createEstimationRouter, initializeAIClient } from './routes/estimation.routes.js'
import { internalServiceAuth } from './middleware/internal.middleware.js'

export function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok\n')
  })

  // Initialize AI client once at startup
  const env = getEnv()
  initializeAIClient(env)

  // Internal routes only (authenticated via service token)
  app.use('/internal/estimation', internalServiceAuth)
  app.use('/internal/estimation', createEstimationRouter())

  // Error handler
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const estimationError = translateEstimationError(err)
    res.status(estimationError.statusCode).json({
      code: estimationError.code,
      message: estimationError.message,
      ...(estimationError.fieldErrors ? { fieldErrors: estimationError.fieldErrors } : {}),
    })
  }

  app.use(errorHandler)

  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp()
  const port = getEnv().port

  app.listen(port, () => {
    console.log(`Credit estimation service listening on port ${port}`)
  })
}
