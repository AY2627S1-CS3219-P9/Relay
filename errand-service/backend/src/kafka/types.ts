import type { ErrandEventType, ErrandEventPayload } from '@relay/contracts'

export interface KafkaEvent {
  eventId: string
  eventType: ErrandEventType
  timestamp: string
  version: 1
  payload: ErrandEventPayload
}

export type EventConsumerHandler = (event: KafkaEvent) => Promise<void>

export interface ConsumerConfig {
  groupId: string
  topics: string[]
  fromBeginning: boolean
}
