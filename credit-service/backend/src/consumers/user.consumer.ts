import { Kafka, logLevel, type Consumer } from 'kafkajs'
import {
  UserEventTypes,
  type UserEvent,
  type AllocateInitialCreditCommand,
  type DeleteUserCreditCommand,
} from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const userEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.iso.datetime(),
  version: z.literal(1),
  eventType: z.enum([UserEventTypes.USER_REGISTERED, UserEventTypes.USER_DELETED]),
  payload: z.object({ cognitoSub: z.string().min(1) }),
})

export class UserEventConsumer {
  private readonly consumer: Consumer
  private readonly topic: string

  constructor(private readonly creditService: CreditService) {
    const env = getEnv()
    this.topic = env.kafkaTopics.userEvents
    const kafka = new Kafka({
      clientId: 'relay-credit-user-consumer',
      brokers: env.kafkaBrokers,
      logLevel: logLevel.ERROR,
    })
    this.consumer = kafka.consumer({
      groupId: 'relay-credit-user-events',
      allowAutoTopicCreation: false,
    })
  }

  async start(): Promise<void> {
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true })
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value: unknown = JSON.parse(message.value?.toString() ?? 'null')
        const event: UserEvent = userEventSchema.parse(value)
        const userId = event.payload.cognitoSub
        if (event.eventType === UserEventTypes.USER_REGISTERED) {
          const command: AllocateInitialCreditCommand = {
            transactionReference: { service: 'user', id: userId, type: 'INITIAL_ALLOCATION' },
            userId,
          }
          await this.creditService.allocateInitialCredit(command)
        } else if (event.eventType === UserEventTypes.USER_DELETED) {
          const command: DeleteUserCreditCommand = {
            transactionReference: { service: 'user', id: userId, type: 'USER_DELETION' },
            userId,
          }
          await this.creditService.deleteUserCredit(command)
        }
        console.log(`Processed ${this.topic} for ${message.key?.toString() ?? 'unknown'}`)
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
  }
}
