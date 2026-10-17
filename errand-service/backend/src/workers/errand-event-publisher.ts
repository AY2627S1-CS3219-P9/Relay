import type { ErrandEvent, ErrandEventType, ErrandEventPayload } from '@relay/contracts'
import type { Kafka, Producer } from 'kafkajs'
import { ErrandRepository } from '../repositories/errand.repository.js'

export class ErrandEventPublisher {
  private readonly producer: Producer
  private timer?: ReturnType<typeof setInterval>
  private flushing = false
  private lastCleanup = 0

  constructor(kafka: Kafka, private readonly repository: ErrandRepository, private readonly topic: string) {
    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
      retry: { retries: 5, initialRetryTime: 100, maxRetryTime: 1000 },
    })
  }

  async start(): Promise<void> {
    if (this.timer) return
    await this.producer.connect()
    const tick = () => void this.flush().catch((error) => {
      console.error('Errand event outbox delivery failed; retrying:', error)
    })
    tick()
    this.timer = setInterval(tick, 1_000)
  }

  async flush(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      for (const stored of await this.repository.unpublishedEvents()) {
        const payload = stored.payload as unknown as ErrandEventPayload
        if (!payload.errandId) throw new Error('errandId is required for Kafka message key')
        const event: ErrandEvent = {
          eventId: stored.id,
          eventType: stored.eventType as ErrandEventType,
          timestamp: new Date().toISOString(),
          version: 1,
          payload,
        }
        await this.producer.send({
          topic: this.topic,
          messages: [{ key: payload.errandId, value: JSON.stringify(event) }],
        })
        await this.repository.markEventPublished(stored.id)
      }
    } finally {
      try {
        if (Date.now() - this.lastCleanup >= 60_000) {
          await this.repository.deleteOldPublishedEvents(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          this.lastCleanup = Date.now()
        }
      } catch (error) {
        console.error('Errand outbox cleanup failed; retrying:', error)
      }
      this.flushing = false
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    while (this.flushing) await new Promise((resolve) => setTimeout(resolve, 50))
    await this.producer.disconnect()
  }
}


