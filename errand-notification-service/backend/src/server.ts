import { createServer } from 'http'
import { Kafka } from 'kafkajs'
import { createNotificationApp } from './app.js'
import { getEnv } from './config/env.js'
import { ErrandNotificationEventStream } from './services/notificationEventStream.js'

const env = getEnv()
const eventStream = new ErrandNotificationEventStream()
const mode = process.env.KAFKA_AUTH_MODE ?? 'none'
if (mode === 'scram' && (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD)) {
  throw new Error('KAFKA_USERNAME and KAFKA_PASSWORD are required for SCRAM')
}
const kafka = new Kafka({
  clientId: 'errand-notification',
  brokers: env.kafkaBrokers.split(','),
  ...(mode === 'scram'
    ? {
        ssl: true,
        sasl: {
          mechanism: 'scram-sha-512' as const,
          username: process.env.KAFKA_USERNAME!,
          password: process.env.KAFKA_PASSWORD!,
        },
      }
    : {}),
})

const { app, consumer, startConsumer } = createNotificationApp(eventStream, kafka)

const server = createServer(app)

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`)
})

let shuttingDown = false

// Graceful shutdown
const shutdown = async (signal: string) => {
  if (shuttingDown) {
    console.log('Shutdown already in progress...')
    return
  }
  shuttingDown = true

  console.log(`${signal} received, shutting down gracefully...`)
  console.log(`Active subscribers: ${eventStream.getSubscriberCount()}`)

  // Close server to stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed')

    // Stop Kafka consumer
    await consumer.stop()
    console.log('Kafka consumer stopped')

    // Log final stats
    const stats = eventStream.getSubscriberStats()
    console.log(`Final subscriber stats: ${JSON.stringify(stats)}`)

    process.exit(0)
  })

  // Force exit after timeout
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, 30_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start the Kafka consumer
startConsumer().catch((err) => {
  console.error('Failed to start consumer:', err)
  process.exit(1)
})
