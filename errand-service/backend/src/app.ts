import express, { type ErrorRequestHandler } from 'express'
import { ErrandErrors } from '@relay/contracts'
import { getEnv } from './config/env.js'
import { ErrandServiceError } from './types/errand.types.js'
import { sessionMiddleware } from './middleware/session.middleware.js'
import { ErrandRepository } from './repositories/errand.repository.js'
import { ErrandService } from './services/errand.service.js'
import { ErrandController } from './controllers/errand.controller.js'
import { createErrandRouter } from './routes/errand.routes.js'
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

  const repository = new ErrandRepository()
  const service = new ErrandService(repository)
  const controller = new ErrandController(service)
  const errandRouter = createErrandRouter(controller)

  app.post(
    '/api/errands/internal/errand/supplier-events',
    internalServiceAuth,
    controller.receiveSupplierEvents,
  )
  app.use('/api/errands', sessionMiddleware, errandRouter)

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ErrandServiceError) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      })
      return
    }

    console.error(error)
    res.status(500).json({ code: ErrandErrors.INTERNAL_ERROR, message: 'Internal server error' })
  }

  app.use(errorHandler)
  return app
}

export const app = createApp()

if (process.env.NODE_ENV !== 'test') {
  const env = getEnv()
  const server = app.listen(env.port, () => {
    console.log(`Errand Service listening on port ${env.port}`)
  })

  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down Errand Service.`)
    server.close(() => process.exit(0))
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}
