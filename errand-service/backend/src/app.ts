import express, { type ErrorRequestHandler } from 'express'
import { ErrandErrors } from '@relay/contracts'
import { getEnv } from './config/env.js'
import { ErrandServiceError } from './types/errand.types.js'
import { sessionMiddleware } from './middleware/session.middleware.js'
import { ErrandRepository } from './repositories/errand.repository.js'
import { ErrandService } from './services/errand.service.js'
import { CreditClient } from './clients/credit.client.js'
import { SupplierClient } from './clients/supplier.client.js'
import { ErrandController } from './controllers/errand.controller.js'
import { ErrandEventStream } from './services/errandEventStream.js'
import { createErrandRouter } from './routes/errand.routes.js'
import { internalServiceAuth } from './middleware/internal.middleware.js'
import { createInternalErrandRouter } from './routes/internal-errand.routes.js'
import { PendingErrandWorker } from './workers/pending-errand.worker.js'

export function createApp(isReady: () => boolean = () => true) {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/healthz', (_req, res) => {
    const ready = isReady()
    res.status(ready ? 200 : 503).send(ready ? 'ok\n' : 'Kafka unavailable\n')
  })

  const eventStream = new ErrandEventStream()
  const repository = new ErrandRepository(undefined, eventStream)
  const creditClient = new CreditClient()
  const supplierClient = new SupplierClient()
  const service = new ErrandService(repository, creditClient, supplierClient)
  const controller = new ErrandController(service, eventStream)
  const errandRouter = createErrandRouter(controller)
  const internalErrandRouter = createInternalErrandRouter(controller)

  app.use('/api/errands', sessionMiddleware, errandRouter)
  app.use('/internal/errands', internalServiceAuth, internalErrandRouter)

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
  const worker = new PendingErrandWorker(new ErrandRepository())
  worker.start()
  const server = app.listen(env.port, () => console.log(`Errand Service listening on port ${env.port}`))
  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down Errand Service.`)
    worker.stop()
    server.close(() => process.exit(0))
  }
  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}
