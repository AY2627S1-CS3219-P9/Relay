import type { Server } from 'node:http'
import { Kafka, logLevel } from 'kafkajs'
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js'
import { app, closeAppResources } from './app.js'
import { getEnv } from './config/env.js'
import { ErrandEventConsumer } from './consumers/errand.consumer.js'
import { UserEventConsumer } from './consumers/user.consumer.js'
import { CreditService } from './services/credit.service.js'
import { CreditRepository } from './repositories/credit.repository.js'

const env = getEnv()
const creditService = new CreditService(new CreditRepository())
const mskIam = process.env.KAFKA_AUTH_MODE === 'iam'
  ? {
      ssl: true,
      sasl: {
        mechanism: 'oauthbearer' as const,
        oauthBearerProvider: async () => {
          const { token } = await generateAuthToken({ region: process.env.AWS_REGION ?? 'us-east-1' })
          return { value: token }
        },
      },
    }
  : {}
const kafka = new Kafka({
  clientId: 'credit-service', brokers: env.kafkaBrokers, logLevel: logLevel.ERROR, ...mskIam,
})
const errandConsumer = new ErrandEventConsumer(creditService, kafka)
const userConsumer = new UserEventConsumer(creditService, kafka)
let server: Server | undefined
let stopping = false

type EventConsumer = { start(): Promise<void>; stop(): Promise<void> }

async function startConsumer(name: string, consumer: EventConsumer): Promise<void> {
  while (!stopping) {
    try {
      await consumer.start()
      return
    } catch (error) {
      console.error(`${name} event consumer failed to start; retrying:`, error)
      await consumer.stop().catch(() => undefined)
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

void startConsumer('Errand', errandConsumer)
void startConsumer('User', userConsumer)

async function shutdown(signal: string): Promise<void> {
  stopping = true
  console.log(`${signal} received; shutting down Credit Service.`)

  await new Promise<void>((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })

  await Promise.all([errandConsumer.stop(), userConsumer.stop()])
  await closeAppResources()
  process.exit(0)
}

server = app.listen(env.port, () => {
  console.log(`Credit Service listening on port ${env.port}`)
})

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
