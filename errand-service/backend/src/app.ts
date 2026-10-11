import express, { type ErrorRequestHandler } from 'express'
import { ErrandErrors } from '@relay/contracts'
import { getEnv } from './config/env.js'
import { ErrandServiceError } from './types/errand.types.js'
import { errandRouter } from './routes/errand.routes.js'
import { sessionMiddleware } from './middleware/session.middleware.js'

export function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok\n')
  })

  app.use('/api/errands', sessionMiddleware, errandRouter)

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ErrandServiceError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message })
      return
    }

    console.error(error)
    res.status(500).json({ code: ErrandErrors.INTERNAL_ERROR, message: 'Internal server error' })
  }

  app.use(errorHandler)
  return app
}

export const app = createApp()

if (process.env.NODE_ENV !== 'test') getEnv()
