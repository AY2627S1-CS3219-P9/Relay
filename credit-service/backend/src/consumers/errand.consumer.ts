import { Kafka, logLevel, type Consumer, type Producer } from 'kafkajs'
import {
  ErrandEventTypes,
  type ErrandEvent,
  type ErrandErrorEvent,
  type ReleaseCreditCommand,
  type TransferCreditCommand,
} from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const errandCreditErrorCodes = {
  RESERVATION_NOT_FOUND: 'ERRAND_RESERVATION_NOT_FOUND',
  REQUESTER_MISMATCH: 'ERRAND_REQUESTER_MISMATCH',
  COURIER_MISSING: 'ERRAND_COURIER_MISSING',
} as const

type ErrandCreditError = {
  code: (typeof errandCreditErrorCodes)[keyof typeof errandCreditErrorCodes]
  message: string
}

const errandEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.iso.datetime(),
  version: z.literal(1),
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

export class ErrandEventConsumer {
  private readonly consumer: Consumer
  private readonly producer: Producer
  private readonly topic: string
  private readonly dlqTopic: string

  constructor(private readonly creditService: CreditService) {
    const env = getEnv()
    this.topic = env.kafkaTopics.errandEvents
    this.dlqTopic = env.kafkaTopics.errandDlq
    const kafka = new Kafka({
      clientId: 'relay-credit-errand-consumer',
      brokers: env.kafkaBrokers,
      logLevel: logLevel.ERROR,
    })
    // Retain the existing group's offsets for errand events.
    this.consumer = kafka.consumer({
      groupId: 'relay-credit-events',
      allowAutoTopicCreation: false,
    })
    this.producer = kafka.producer({ allowAutoTopicCreation: false })
  }

  private async rejectErrandEvent(event: ErrandEvent, error: ErrandCreditError): Promise<void> {
    const failedEvent: ErrandErrorEvent = {
      ...event,
      error: { code: error.code, message: error.message },
    }
    await this.producer.send({
      topic: this.dlqTopic,
      messages: [{ key: event.payload.errandId, value: JSON.stringify(failedEvent) }],
    })
    console.warn(`Rejected ${event.eventType} for ${event.payload.errandId}: ${error.code}`)
  }

  private async processErrandOutcome(event: ErrandEvent): Promise<void> {
    const { errandId, requesterSub, courierSub } = event.payload
    const reservation = await this.creditService.findReservation(errandId)
    if (!reservation) {
      await this.rejectErrandEvent(event, {
        code: errandCreditErrorCodes.RESERVATION_NOT_FOUND,
        message: `Errand ${errandId} has no prior credit reservation.`,
      })
      return
    }
    if (requesterSub && requesterSub !== reservation.userId) {
      await this.rejectErrandEvent(event, {
        code: errandCreditErrorCodes.REQUESTER_MISMATCH,
        message: `Errand ${errandId} requester does not match its credit reservation.`,
      })
      return
    }

    if (event.eventType === ErrandEventTypes.ERRAND_COMPLETED) {
      if (!courierSub) {
        await this.rejectErrandEvent(event, {
          code: errandCreditErrorCodes.COURIER_MISSING,
          message: `Completed errand ${errandId} has no courier.`,
        })
        return
      }
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

  async start(): Promise<void> {
    await this.producer.connect()
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true })
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value: unknown = JSON.parse(message.value?.toString() ?? 'null')
        const event: ErrandEvent = errandEventSchema.parse(value)
        if (
          event.eventType === ErrandEventTypes.ERRAND_COMPLETED ||
          event.eventType === ErrandEventTypes.ERRAND_CANCELLED ||
          event.eventType === ErrandEventTypes.ERRAND_EXPIRED
        ) {
          await this.processErrandOutcome(event)
        }
        console.log(`Processed ${this.topic} for ${message.key?.toString() ?? 'unknown'}`)
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
    await this.producer.disconnect()
  }
}
