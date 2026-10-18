import { randomUUID } from 'node:crypto'
import type { Kafka, Consumer, KafkaMessage, Producer } from 'kafkajs'
import { ErrandEventTypes, type ErrandEvent, type ErrandErrorEvent } from '@relay/contracts'
import { z } from 'zod'
import { getEnv } from '../config/env.js'
import { CreditService } from '../services/credit.service.js'

const errandCreditErrorCodes = {
  INVALID_EVENT: 'ERRAND_EVENT_INVALID',
  RESERVATION_NOT_FOUND: 'ERRAND_RESERVATION_NOT_FOUND',
  REQUESTER_MISMATCH: 'ERRAND_REQUESTER_MISMATCH',
  COURIER_MISSING: 'ERRAND_COURIER_MISSING',
  COURIER_MISMATCH: 'ERRAND_COURIER_MISMATCH',
  OUTCOME_CONFLICT: 'ERRAND_CREDIT_OUTCOME_CONFLICT',
  INSUFFICIENT_RESERVED_CREDIT: 'ERRAND_INSUFFICIENT_RESERVED_CREDIT',
  CREDIT_OPERATION_FAILED: 'ERRAND_CREDIT_OPERATION_FAILED',
} as const
type ErrorCode = (typeof errandCreditErrorCodes)[keyof typeof errandCreditErrorCodes]

class EventError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message) }
}

const eventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.iso.datetime(),
  version: z.literal(1),
  eventType: z.enum([
    ErrandEventTypes.ERRAND_CREATED,
    ErrandEventTypes.ERRAND_CREATION_FAILED,
    ErrandEventTypes.ERRAND_COMPLETED,
    ErrandEventTypes.ERRAND_CANCELLED,
    ErrandEventTypes.ERRAND_EXPIRED,
    ErrandEventTypes.ERRAND_DELETED,
  ]),
  payload: z.object({
    errandId: z.string().min(1),
    requesterSub: z.string().min(1).optional(),
    courierSub: z.string().min(1).optional(),
  }).passthrough(),
})

function classify(error: unknown): EventError {
  if (error instanceof EventError) return error
  if (error instanceof SyntaxError || error instanceof z.ZodError) {
    return new EventError(errandCreditErrorCodes.INVALID_EVENT, 'The event is not a valid errand event.')
  }
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('Reservation requester mismatch')) {
    return new EventError(errandCreditErrorCodes.REQUESTER_MISMATCH, 'The requester does not match the credit reservation.')
  }
  if (message.startsWith('No prior credit reservation')) {
    return new EventError(errandCreditErrorCodes.RESERVATION_NOT_FOUND, 'No prior credit reservation exists.')
  }
  if (message.startsWith('Cannot release credit') || message.startsWith('Cannot transfer credit')) {
    return new EventError(errandCreditErrorCodes.OUTCOME_CONFLICT, 'A conflicting credit outcome was already recorded.')
  }
  if (message.startsWith('Insufficient reserved credit')) {
    return new EventError(errandCreditErrorCodes.INSUFFICIENT_RESERVED_CREDIT, 'The reserved credit is insufficient.')
  }
  return new EventError(errandCreditErrorCodes.CREDIT_OPERATION_FAILED, 'The credit operation could not be completed.')
}

function dlqEvent(value: unknown, key: string | undefined): ErrandEvent {
  const valid = eventSchema.safeParse(value)
  if (valid.success) return valid.data as ErrandEvent
  const envelope = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const payload = envelope.payload && typeof envelope.payload === 'object'
    ? envelope.payload as Record<string, unknown> : {}
  return {
    eventId: typeof envelope.eventId === 'string' && z.uuid().safeParse(envelope.eventId).success
      ? envelope.eventId : randomUUID(),
    eventType: ErrandEventTypes.ERRAND_EVENT_INVALID,
    timestamp: new Date().toISOString(),
    version: 1,
    payload: {
      errandId: typeof payload.errandId === 'string' && payload.errandId ? payload.errandId : key || 'unknown',
      metadata: { rawEvent: JSON.stringify(value) ?? 'null' },
    },
  }
}

export class ErrandEventConsumer {
  private readonly consumer: Consumer
  private readonly producer: Producer
  private readonly topic: string
  private readonly dlqTopic: string

  constructor(private readonly creditService: CreditService, kafka: Kafka) {
    const env = getEnv()
    this.topic = env.kafkaTopics.errandEvents
    this.dlqTopic = env.kafkaTopics.errandDlq
    this.consumer = kafka.consumer({
      groupId: 'relay-credit-events',
      allowAutoTopicCreation: false,
    })
    this.producer = kafka.producer({ allowAutoTopicCreation: false })
  }

  private async process(event: ErrandEvent): Promise<void> {
    const { errandId, requesterSub, courierSub } = event.payload
    const handled: readonly string[] = [ErrandEventTypes.ERRAND_CREATION_FAILED, ErrandEventTypes.ERRAND_COMPLETED,
      ErrandEventTypes.ERRAND_CANCELLED, ErrandEventTypes.ERRAND_EXPIRED]
    if (!handled.includes(event.eventType)) return
    if (event.eventType === ErrandEventTypes.ERRAND_CREATION_FAILED) {
      if (!requesterSub)
        throw new EventError(errandCreditErrorCodes.INVALID_EVENT, 'The requester is missing.')
      await this.creditService.closeUnreservedCredit(
        { service: 'errand', id: errandId, type: 'CREDIT_RELEASE' }, requesterSub)
      return
    }
    const reservation = await this.creditService.findReservation({ service: 'errand', id: errandId })
    if (!reservation)
      throw new EventError(errandCreditErrorCodes.RESERVATION_NOT_FOUND, 'No prior credit reservation exists.')
    if (requesterSub && requesterSub !== reservation.userId) {
      throw new EventError(errandCreditErrorCodes.REQUESTER_MISMATCH, 'The requester does not match the credit reservation.')
    }
    if (event.eventType === ErrandEventTypes.ERRAND_COMPLETED) {
      if (!courierSub) throw new EventError(errandCreditErrorCodes.COURIER_MISSING, 'The courier is missing.')
      if (courierSub === reservation.userId) {
        throw new EventError(errandCreditErrorCodes.COURIER_MISMATCH, 'The courier and requester must differ.')
      }
      await this.creditService.transferCredit({
        transactionReference: { service: 'errand', id: errandId, type: 'CREDIT_TRANSFER' },
        senderId: reservation.userId,
        receiverId: courierSub,
        amount: reservation.amount,
      })
    } else {
      await this.creditService.releaseCredit({
        transactionReference: { service: 'errand', id: errandId, type: 'CREDIT_RELEASE' },
        userId: reservation.userId,
        amount: reservation.amount,
      })
    }
  }

  // Kafka may commit the source offset only after processing or DLQ publication succeeds.
  async handleMessage(message: Pick<KafkaMessage, 'key' | 'value'>): Promise<void> {
    const key = message.key?.toString()
    let value: unknown = null
    let event: ErrandEvent | undefined
    try {
      const raw = message.value?.toString() ?? 'null'
      value = raw
      value = JSON.parse(raw)
      event = eventSchema.parse(value) as ErrandEvent
      await this.process(event)
      console.log('Processed ' + this.topic + ' for ' + (key ?? 'unknown'))
    } catch (error) {
      const rejection = classify(error)
      const failed: ErrandErrorEvent = {
        ...(event ?? dlqEvent(value, key)),
        error: { code: rejection.code, message: rejection.message },
      }
      // Propagate a DLQ failure; acknowledging the source then would lose the event.
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [{ key: failed.payload.errandId, value: JSON.stringify(failed) }],
      })
      console.warn('Rejected ' + failed.eventType + ' for ' + failed.payload.errandId + ': ' + rejection.code)
    }
  }

  async start(): Promise<void> {
    await this.producer.connect()
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true })
    await this.consumer.run({ eachMessage: async ({ message }) => this.handleMessage(message) })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
    await this.producer.disconnect()
  }
}