import { Kafka, logLevel, type Consumer } from 'kafkajs'
import {
  ErrandEventTypes,
  UserEventTypes,
  type ErrandEvent,
  type UserEvent,
  type AllocateInitialCreditCommand,
  type DeleteUserCreditCommand,
  type ReleaseCreditCommand,
  type TransferCreditCommand,
} from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const envelopeFields = {
  eventId: z.string().uuid(),
  timestamp: z.iso.datetime(),
  version: z.literal(1),
}

const userEventSchema = z.object({
  ...envelopeFields,
  eventType: z.enum([UserEventTypes.USER_REGISTERED, UserEventTypes.USER_DELETED]),
  payload: z.object({ cognitoSub: z.string().min(1) }),
})

const errandEventSchema = z.object({
  ...envelopeFields,
  eventType: z.enum([
    ErrandEventTypes.ERRAND_CREATED,
    ErrandEventTypes.ERRAND_STATUS_CHANGED,
    ErrandEventTypes.ERRAND_COMPLETED,
    ErrandEventTypes.ERRAND_CANCELLED,
    ErrandEventTypes.ERRAND_EXPIRED,
    ErrandEventTypes.ERRAND_DELETED,
  ]),
  payload: z
    .object({
      errandId: z.string().min(1),
      requesterSub: z.string().min(1).optional(),
      courierSub: z.string().min(1).optional(),
    })
    .passthrough(),
})

export class CreditEventConsumer {
  private readonly consumer: Consumer
  private readonly topics: ReturnType<typeof getEnv>['kafkaTopics']

  constructor(private readonly creditService: CreditService) {
    const env = getEnv()
    this.topics = env.kafkaTopics
    const kafka = new Kafka({
      clientId: 'relay-credit-service',
      brokers: env.kafkaBrokers,
      logLevel: logLevel.ERROR,
    })
    this.consumer = kafka.consumer({ groupId: 'relay-credit-events' })
  }

  async start(): Promise<void> {
    await this.consumer.connect()
    for (const topic of Object.values(this.topics)) {
      await this.consumer.subscribe({ topic, fromBeginning: true })
    }
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const value: unknown = JSON.parse(message.value?.toString() ?? 'null')
        if (topic === this.topics.userEvents) {
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
        } else if (topic === this.topics.errandEvents) {
          const event: ErrandEvent = errandEventSchema.parse(value)
          const { errandId, requesterSub, courierSub } = event.payload
          if (
            event.eventType === ErrandEventTypes.ERRAND_COMPLETED ||
            event.eventType === ErrandEventTypes.ERRAND_CANCELLED ||
            event.eventType === ErrandEventTypes.ERRAND_EXPIRED
          ) {
            const reservation = await this.creditService.findReservation(errandId)
            if (!reservation) throw new Error(`No credit reservation for errand ${errandId}.`)
            if (requesterSub && requesterSub !== reservation.userId)
              throw new Error(`Requester does not match the credit reservation for ${errandId}.`)

            if (event.eventType === ErrandEventTypes.ERRAND_COMPLETED) {
              if (!courierSub) throw new Error('Completed errand event has no courier.')
              const command: TransferCreditCommand = {
                transactionReference: { service: 'errand', id: errandId, type: 'CREDIT_TRANSFER' },
                senderId: reservation.userId,
                receiverId: courierSub,
                amount: reservation.amount,
              }
              await this.creditService.transferCredit(command)
            } else {
              const command: ReleaseCreditCommand = {
                transactionReference: { service: 'errand', id: errandId, type: 'CREDIT_RELEASE' },
                userId: reservation.userId,
                amount: reservation.amount,
              }
              await this.creditService.releaseCredit(command)
            }
          }
        }
        console.log(`Processed ${topic} for ${message.key?.toString() ?? 'unknown'}`)
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
  }
}
