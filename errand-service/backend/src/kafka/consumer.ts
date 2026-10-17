import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs'
import { getEnv } from '../config/env.js'
import type { KafkaEvent } from './types.js'

const env = getEnv()

export const kafka = new Kafka({
  clientId: 'errand-service-consumer',
  brokers: env.kafkaBrokers.split(','),
  retry: {
    retries: 3,
    initialRetryTime: 100,
    maxRetryTime: 1000,
  },
})

let consumer: Consumer | null = null

export async function connectConsumer(groupConfig: {
  groupId: string
  topics: string[]
}): Promise<void> {
  consumer = kafka.consumer({
    groupId: groupConfig.groupId,
    allowAutoTopicCreation: false,
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
  })

  await consumer.connect()
  console.log(`Kafka consumer connected (group: ${groupConfig.groupId})`)
}

export async function subscribeToEvents(
  handlers: Record<string, (payload: EachMessagePayload) => Promise<void>>,
): Promise<void> {
  if (!consumer) {
    throw new Error('Consumer not initialized. Call connectConsumer() first.')
  }

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const handler = handlers[payload.topic]
      if (handler) {
        await handler(payload)
      }
    },
  })
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect()
    console.log('Kafka consumer disconnected')
  }
}

export async function getConsumerGroupStatus(): Promise<string | null> {
  if (!consumer) {
    return null
  }

  // KafkaJS consumer groups are registered on connect
  // We can check if the consumer is connected to the group
  const groupId = env.kafkaGroupId
  return groupId
}
