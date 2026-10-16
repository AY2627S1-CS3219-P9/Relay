import { Kafka, type Producer, type RecordMetadata } from 'kafkajs'
import { getEnv } from '../config/env.js'
import type { ErrandEventPayload } from '@relay/contracts'

const env = getEnv()

export const kafka = new Kafka({
  clientId: 'errand-service',
  brokers: env.kafkaBrokers.split(','),
  retry: {
    retries: 3,
    initialRetryTime: 100,
    maxRetryTime: 1000,
  },
})

export const producer: Producer = kafka.producer({
  idempotent: true,
  retry: {
    retries: 5,
    initialRetryTime: 100,
    maxRetryTime: 1000,
  },
})

export async function connectProducer(): Promise<void> {
  await producer.connect()
  console.log('Kafka producer connected')
}

export async function disconnectProducer(): Promise<void> {
  await producer.disconnect()
  console.log('Kafka producer disconnected')
}

export async function publishEvent(
  topic: string,
  eventType: string,
  payload: ErrandEventPayload,
): Promise<RecordMetadata[]> {
  const eventId = crypto.randomUUID()
  const timestamp = new Date().toISOString()

  const message = {
    eventId,
    eventType,
    timestamp,
    version: 1,
    payload,
  }

  // Ensure errandId exists for partitioning key
  if (!payload.errandId) {
    throw new Error('errandId is required in payload for Kafka partitioning')
  }

  return producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(message),
        partition: 0, // KafkaJS requires explicit partition or use partitioner
      },
    ],
  })
}
