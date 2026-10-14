import { Kafka, logLevel, type Consumer } from 'kafkajs'
import type { AllocateInitialCreditCommand, NewUserEvent } from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const newUserEvent = z.object({ cognitoSub: z.string().min(1) })

export class NewUserConsumer {
  private readonly consumer: Consumer
  private readonly kafka: Kafka

  constructor(private readonly creditService: CreditService) {
    const env = getEnv()
    this.kafka = new Kafka({
      clientId: 'relay-credit-service',
      brokers: env.kafkaBrokers,
      logLevel: logLevel.ERROR,
    })
    this.consumer = this.kafka.consumer({ groupId: env.kafkaGroupId })
  }

  async start(): Promise<void> {
    const admin = this.kafka.admin()
    await admin.connect()
    try {
      const topics = await admin.listTopics()
      if (!topics.includes('relay.user.created')) {
        await admin.createTopics({
          topics: [{ topic: 'relay.user.created', numPartitions: 1, replicationFactor: 1 }],
          waitForLeaders: true,
        })
      }
    } finally {
      await admin.disconnect()
    }
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: 'relay.user.created', fromBeginning: true })
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const event: NewUserEvent = newUserEvent.parse(
          JSON.parse(message.value?.toString() ?? 'null'),
        )
        const command: AllocateInitialCreditCommand = {
          transactionReference: {
            service: 'user',
            id: event.cognitoSub,
            type: 'INITIAL_ALLOCATION',
          },
          userId: event.cognitoSub,
        }
        await this.creditService.allocateInitialCredit(command)
        console.log(`Processed new-user credit allocation for ${event.cognitoSub}`)
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
  }
}
