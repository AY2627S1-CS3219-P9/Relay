import type { ErrandStatus } from './models'

/** Kafka event types for errand lifecycle events. */
export const ErrandEventTypes = {
  ERRAND_CREATED: 'ErrandCreated',
  ERRAND_STATUS_CHANGED: 'ErrandStatusChanged',
  ERRAND_COMPLETED: 'ErrandCompleted',
  ERRAND_CANCELLED: 'ErrandCancelled',
  ERRAND_EXPIRED: 'ErrandExpired',
} as const

export type ErrandEventType = (typeof ErrandEventTypes)[keyof typeof ErrandEventTypes]

/** Kafka event envelope for all errand events. */
export interface ErrandEvent {
  eventId: string                   // UUID v4 for deduplication
  eventType: ErrandEventType
  timestamp: string                 // ISO 8601
  version: 1
  payload: ErrandEventPayload
}

/** Common payload for all errand events. */
export interface ErrandEventPayload {
  errandId: string
  errandStatus?: ErrandStatus
  previousStatus?: ErrandStatus
  actorSub?: string                 // Who triggered the change (user/courier/system)
  actorType?: 'user' | 'courier' | 'system'
  requesterSub?: string             // Optional for some events (e.g., status change, expiry)
  courierSub?: string
  supplierId?: string
  creditAmount?: number
  expiresAt?: string
  reason?: string                   // Optional reason for cancellation
  metadata?: Record<string, string>
}

/** Kafka topic names for errand events. */
export const ErrandTopics = {
  ERRAND_EVENTS: 'errand-events',
  ERRAND_DLQ: 'errand-events-dlq',
} as const

export type ErrandTopic = (typeof ErrandTopics)[keyof typeof ErrandTopics]
