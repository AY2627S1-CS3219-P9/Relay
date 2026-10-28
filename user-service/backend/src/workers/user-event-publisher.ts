import { Kafka, logLevel, type Producer } from 'kafkajs'
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js'
import { prisma } from '../repositories/user.repository.js'
import { getEnv } from '../config/env.js'

export class UserEventPublisher {
  private readonly producer: Producer
  private timer?: ReturnType<typeof setInterval>
  private connected = false
  private flushing = false
  private lastCleanup = 0

  constructor() {
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
    this.producer = new Kafka({
      clientId: 'user-service',
      brokers: getEnv().kafkaBrokers,
      logLevel: logLevel.ERROR,
      ...mskIam,
    }).producer()
  }

  start(): void {
    this.timer = setInterval(() => void this.flush(), 1000)
    void this.flush()
  }

  private async flush(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      if (!this.connected) {
        await this.producer.connect()
        this.connected = true
      }
      const pending = await prisma.userOutboxEvent.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      for (const event of pending) {
        await this.producer.send({
          topic: event.topic,
          messages: [{ key: event.key, value: JSON.stringify(event.payload) }],
        })
        await prisma.userOutboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        })
        console.log(`Published ${event.topic} for ${event.key}`)
      }
    } catch (error) {
      console.error('User event outbox delivery failed; retrying:', error)
    } finally {
      try {
        if (Date.now() - this.lastCleanup >= 60_000) {
          await prisma.userOutboxEvent.deleteMany({
            where: { publishedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          })
          this.lastCleanup = Date.now()
        }
      } catch (error) {
        console.error('User outbox cleanup failed; retrying:', error)
      }
      this.flushing = false
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    while (this.flushing) await new Promise((resolve) => setTimeout(resolve, 50))
    if (this.connected) await this.producer.disconnect()
  }
}
