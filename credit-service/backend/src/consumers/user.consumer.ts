import { randomUUID } from 'node:crypto'
import type { Kafka, Consumer, KafkaMessage, Producer } from 'kafkajs'
import {
  UserEventTypes,
  type UserEvent,
  type UserEventDlqErrorCode,
  type UserEventDlqMessage,
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
  payload: z.object({
    cognitoSub: z.string().trim().min(1).refine((value) => !value.includes(':')),
  }),
})

class UserEventRejection extends Error {
  constructor(readonly code: UserEventDlqErrorCode, message: string) { super(message) }
}

function classify(error: unknown): UserEventRejection {
  if (error instanceof UserEventRejection) return error
  if (error instanceof SyntaxError || error instanceof z.ZodError) {
    return new UserEventRejection('USER_EVENT_INVALID', 'The message is not a valid user event.')
  }
  return new UserEventRejection('USER_CREDIT_OPERATION_FAILED', 'The credit operation could not be completed.')
}

function rejectedEvent(event: UserEvent | undefined, raw: string, key: string | undefined,
  rejection: UserEventRejection): UserEventDlqMessage {
  if (event) return { ...event, error: { code: rejection.code, message: rejection.message } }
  return {
    eventId: randomUUID(),
    eventType: 'UserEventInvalid',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: { cognitoSub: key || 'unknown', metadata: { rawEvent: raw } },
    error: { code: rejection.code, message: rejection.message },
  }
}

export class UserEventConsumer {
  private readonly consumer: Consumer
  private readonly producer: Producer
  private readonly topic: string
  private readonly dlqTopic: string
  private stopping = false

  constructor(private readonly creditService: CreditService, kafka: Kafka) {
    const env = getEnv()
    this.topic = env.kafkaTopics.userEvents
    this.dlqTopic = env.kafkaTopics.userDlq
    this.consumer = kafka.consumer({
      groupId: 'relay-credit-user-events',
      allowAutoTopicCreation: false,
    })
    this.producer = kafka.producer({ allowAutoTopicCreation: false })
  }

  private async process(event: UserEvent): Promise<void> {
    const userId = event.payload.cognitoSub
    if (event.eventType === UserEventTypes.USER_REGISTERED) {
      const command: AllocateInitialCreditCommand = {
        transactionReference: { service: 'user', id: userId, type: 'INITIAL_ALLOCATION' },
        userId,
      }
      const outcome = await this.creditService.allocateInitialCredit(command)
      if (outcome === 'duplicate') {
        throw new UserEventRejection('USER_EVENT_DUPLICATE', 'Initial credit was already allocated for this user.')
      }
      if (outcome === 'out-of-order') {
        throw new UserEventRejection('USER_EVENT_OUT_OF_ORDER', 'Registration arrived after user deletion.')
      }
    } else if (event.eventType === UserEventTypes.USER_DELETED) {
      const command: DeleteUserCreditCommand = {
        transactionReference: { service: 'user', id: userId, type: 'USER_DELETION' },
        userId,
      }
      const outcome = await this.creditService.deleteUserCredit(command)
      if (outcome === 'duplicate') {
        throw new UserEventRejection('USER_EVENT_DUPLICATE', 'User credit was already deleted.')
      }
      if (outcome === 'out-of-order') {
        throw new UserEventRejection('USER_EVENT_OUT_OF_ORDER', 'User deletion could not be applied in order.')
      }
    }
  }

  // Returning acknowledges the source message. A failed DLQ write is thrown so
  // Kafka retries instead of silently losing the rejected event.
  async handleMessage(message: Pick<KafkaMessage, 'key' | 'value'>): Promise<void> {
    const key = message.key?.toString()
    const raw = message.value?.toString() ?? 'null'
    let event: UserEvent | undefined
    try {
      event = userEventSchema.parse(JSON.parse(raw)) as UserEvent
      if (key !== event.payload.cognitoSub) {
        throw new UserEventRejection('USER_EVENT_INVALID', 'The Kafka key does not match the user subject.')
      }
      await this.process(event)
      console.log(`Processed ${this.topic} for ${event.payload.cognitoSub}`)
    } catch (error) {
      const rejection = classify(error)
      const failed = rejectedEvent(event, raw, key, rejection)
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [{ key: failed.payload.cognitoSub, value: JSON.stringify(failed) }],
      })
      console.warn(`Rejected ${failed.eventType} for ${failed.payload.cognitoSub}: ${rejection.code}`)
    }
  }

  private async handleWithRetry(message: Pick<KafkaMessage, 'key' | 'value'>): Promise<void> {
    while (!this.stopping) {
      try {
        await this.handleMessage(message)
        return
      } catch (error) {
        console.error('User event DLQ delivery failed; retrying the same source message:', error)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  async start(): Promise<void> {
    this.stopping = false
    await this.producer.connect()
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true })
    await this.consumer.run({ eachMessage: async ({ message }) => this.handleWithRetry(message) })
  }

  async stop(): Promise<void> {
    this.stopping = true
    await this.consumer.disconnect()
    await this.producer.disconnect()
  }
}
