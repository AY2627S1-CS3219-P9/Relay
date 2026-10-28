import express, { type ErrorRequestHandler } from 'express'
import { Kafka } from 'kafkajs'
import { generateAuthTokenFromCredentialsProvider } from 'aws-msk-iam-sasl-signer-js'
import { fromHttp } from '@aws-sdk/credential-provider-http'
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
import { ErrandConsumer } from './consumers/consumer.js'
import { internalServiceAuth } from './middleware/internal.middleware.js'
import { createInternalErrandRouter } from './routes/internal-errand.routes.js'
import { PendingErrandWorker } from './workers/pending-errand.worker.js'
import { ErrandEventPublisher } from './workers/errand-event-publisher.js'

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

let kafkaReady = process.env.NODE_ENV === 'test'
export const app = createApp(() => kafkaReady)

if (process.env.NODE_ENV !== 'test') {
  const env = getEnv()
  const kafkaAuth = process.env.KAFKA_AUTH_MODE === 'iam'
    ? {
        ssl: true,
        sasl: {
          mechanism: 'oauthbearer' as const,
          oauthBearerProvider: async () => {
            const { token } = await generateAuthTokenFromCredentialsProvider({
              region: process.env.AWS_REGION ?? 'us-east-1',
              awsCredentialsProvider: fromHttp(),
            })
            return { value: token }
          },
        },
      }
    : process.env.KAFKA_AUTH_MODE === 'plain'
      ? {
          sasl: {
            mechanism: 'plain' as const,
            username: process.env.KAFKA_USERNAME ?? '',
            password: process.env.KAFKA_PASSWORD ?? '',
          },
        }
      : {}

  if (process.env.KAFKA_AUTH_MODE === 'plain' && (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD)) {
    throw new Error('KAFKA_USERNAME and KAFKA_PASSWORD are required for plain Kafka authentication')
  }

  const kafka = new Kafka({
    clientId: 'errand-service',
    brokers: env.kafkaBrokers.split(','),
    retry: { retries: 3, initialRetryTime: 100, maxRetryTime: 1000 },
    ...kafkaAuth,
  })
  const consumer = new ErrandConsumer(kafka)
  const worker = new PendingErrandWorker(new ErrandRepository())
  const publisher = new ErrandEventPublisher(
    kafka,
    new ErrandRepository(),
    env.kafkaTopicErrandEvents,
  )
  worker.start()
  let stopping = false
  const connectPublisher = async () => {
    while (!stopping) {
      try {
        await publisher.start()
        kafkaReady = true
        return
      } catch (err) {
        console.error('Failed to connect Kafka producer; retrying:', err)
        await publisher.stop().catch(() => undefined)
        if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5_000))
      }
    }
  }
  const publisherConnection = connectPublisher()

  const server = app.listen(env.port, () => {
    console.log(`Errand Service listening on port ${env.port}`)
  })

  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down Errand Service.`)
    stopping = true
    kafkaReady = false
    worker.stop()
    server.close(async () => {
      await publisherConnection
      await publisher.stop()
      await consumer.stop()
      process.exit(0)
    })
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}
