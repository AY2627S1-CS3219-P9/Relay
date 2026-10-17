import { Kafka, type Producer, type RecordMetadata } from 'kafkajs'
import { type ErrandEvent, type ErrandEventPayload, type ErrandEventType } from '@relay/contracts'
import { getEnv } from '../config/env.js'

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
  allowAutoTopicCreation: false,
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
}

export async function publishEvent(
  eventType: ErrandEventType,
  payload: ErrandEventPayload,
): Promise<RecordMetadata[]> {
  if (!payload.errandId) {
    throw new Error('errandId is required for Kafka message key')
  }

  const event: ErrandEvent = {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    version: 1,
    payload,
  }

  return producer.send({
    topic: env.kafkaTopicErrandEvents,
    messages: [{ key: payload.errandId, value: JSON.stringify(event) }],
  })
}
