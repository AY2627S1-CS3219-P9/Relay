import { describe, expect, it } from 'vitest'
import { UserDeletionConsumer } from '../src/consumers/user-deletion.consumer.js'
import type { ErrandRepository } from '../src/repositories/errand.repository.js'

class FakeConsumer {
  async connect() {}
  async disconnect() {}
  async subscribe() {}
  async run() {}
}

class FakeProducer {
  messages: unknown[] = []
  async connect() {}
  async disconnect() {}
  async send(record: unknown) { this.messages.push(record) }
}

class FakeKafka {
  producerInstance = new FakeProducer()
  consumer() { return new FakeConsumer() }
  producer() { return this.producerInstance }
}

const env = {
  kafkaBrokers: ['kafka:9092'],
  kafkaAuthMode: 'none',
  kafkaUserEventsTopic: 'user-events',
  kafkaUserDlqTopic: 'user-events-dlq',
} as never

const message = (eventType: 'UserDeleted' | 'UserRegistered') => ({
  key: Buffer.from('requester-sub'),
  value: Buffer.from(JSON.stringify({
    eventId: 'f6f9e9e0-4d6f-4c4d-8aa7-1b3c4a83cf73',
    eventType,
    timestamp: new Date().toISOString(),
    version: 1,
    payload: { cognitoSub: 'requester-sub' },
  })),
})

describe('UserDeletionConsumer', () => {
  it('transitions requester errands for UserDeleted events', async () => {
    const deleted: string[] = []
    const repository = {
      handleRequesterDeleted: async (sub: string) => { deleted.push(sub); return 3 },
    } as unknown as ErrandRepository
    const consumer = new UserDeletionConsumer(repository, new FakeKafka() as never, env)

    await consumer.handleMessage(message('UserDeleted'))

    expect(deleted).toEqual(['requester-sub'])
  })

  it('acknowledges UserRegistered events without changing errands', async () => {
    let called = false
    const repository = {
      handleRequesterDeleted: async () => { called = true; return 0 },
    } as unknown as ErrandRepository
    const consumer = new UserDeletionConsumer(repository, new FakeKafka() as never, env)

    await consumer.handleMessage(message('UserRegistered'))

    expect(called).toBe(false)
  })
})
