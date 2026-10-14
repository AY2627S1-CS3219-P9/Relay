import { Kafka, logLevel, type Consumer } from 'kafkajs'
import type {
  AllocateInitialCreditCommand,
  DeleteUserCreditCommand,
  ErrandCancelledEvent,
  ErrandConfirmedEvent,
  ErrandExpiredEvent,
  ReleaseCreditCommand,
  TransferCreditCommand,
  UserDeletedEvent,
  UserRegisteredEvent,
} from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const userEventSchema = z.object({ cognitoSub: z.string().min(1) })
const errandEventSchema = z.object({
  errand: z.object({
    id: z.string().min(1),
    requesterSub: z.string().min(1),
    courierSub: z.string().nullable(),
    creditAmount: z.number().positive().finite(),
    status: z.string(),
  }),
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
        const payload: unknown = JSON.parse(message.value?.toString() ?? 'null')
        if (topic === this.topics.userRegistered) {
          const event: UserRegisteredEvent = userEventSchema.parse(payload)
          const command: AllocateInitialCreditCommand = {
            transactionReference: { service: 'user', id: event.cognitoSub, type: 'INITIAL_ALLOCATION' },
            userId: event.cognitoSub,
          }
          await this.creditService.allocateInitialCredit(command)
        } else if (topic === this.topics.userDeleted) {
          const event: UserDeletedEvent = userEventSchema.parse(payload)
          const command: DeleteUserCreditCommand = {
            transactionReference: { service: 'user', id: event.cognitoSub, type: 'USER_DELETION' },
            userId: event.cognitoSub,
          }
          await this.creditService.deleteUserCredit(command)
        } else {
          const { errand } = errandEventSchema.parse(payload)
          if (topic === this.topics.errandConfirmed) {
            const status: ErrandConfirmedEvent['errand']['status'] = errand.status as ErrandConfirmedEvent['errand']['status']
            if (status !== 'CONFIRMED' || !errand.courierSub) throw new Error('Invalid confirmed errand event.')
            const command: TransferCreditCommand = {
              transactionReference: { service: 'errand', id: errand.id, type: 'CREDIT_TRANSFER' },
              senderId: errand.requesterSub,
              receiverId: errand.courierSub,
              amount: errand.creditAmount,
            }
            await this.creditService.transferCredit(command)
          } else {
            const status: ErrandCancelledEvent['errand']['status'] | ErrandExpiredEvent['errand']['status'] = errand.status as ErrandCancelledEvent['errand']['status']
            if (
              (topic === this.topics.errandCancelled && status !== 'CANCELLED') ||
              (topic === this.topics.errandExpired && status !== 'EXPIRED')
            ) throw new Error('Invalid released errand event.')
            const command: ReleaseCreditCommand = {
              transactionReference: { service: 'errand', id: errand.id, type: 'CREDIT_RELEASE' },
              userId: errand.requesterSub,
              amount: errand.creditAmount,
            }
            await this.creditService.releaseCredit(command)
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
