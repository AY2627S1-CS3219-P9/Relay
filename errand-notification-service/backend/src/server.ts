import { createServer } from 'http'
import { Kafka } from 'kafkajs'
import { createNotificationApp } from './app.js'
import { getEnv } from './config/env.js'
import { ErrandNotificationEventStream } from './services/notificationEventStream.js'

const env = getEnv()
const eventStream = new ErrandNotificationEventStream()
const kafka = new Kafka({
  clientId: 'errand-notification',
  brokers: [env.kafkaBrokers],
})

const { app, consumer, startConsumer } = createNotificationApp(eventStream, kafka)

const server = createServer(app)

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(async () => {
    await consumer.stop()
    process.exit(0)
  })
})

// Start the Kafka consumer
startConsumer().catch((err) => {
  console.error('Failed to start consumer:', err)
  process.exit(1)
})
