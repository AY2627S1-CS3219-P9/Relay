import {
  ErrandEventTypes,
  type ErrandEvent,
  type ErrandEventPayload,
  type ErrandStatus,
} from '@relay/contracts'
import { ErrandTopics } from '@relay/contracts'
import { publishEvent } from './producer.js'

/**
 * Event bus for publishing errand events to Kafka.
 */
export class EventBus {
  async publishErrandCreated(
    errandId: string,
    payload: {
      requesterSub: string
      supplierId?: string
      creditAmount: number
      expiresAt: string
    },
  ): Promise<void> {
    const event: ErrandEvent = {
      eventId: crypto.randomUUID(),
      eventType: ErrandEventTypes.ERRAND_CREATED,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        errandId,
        requesterSub: payload.requesterSub,
        supplierId: payload.supplierId,
        creditAmount: payload.creditAmount,
        expiresAt: payload.expiresAt,
      },
    }

    await publishEvent(ErrandTopics.ERRAND_EVENTS, ErrandEventTypes.ERRAND_CREATED, event.payload)
  }

  async publishErrandStatusChanged(
    errandId: string,
    newStatus: ErrandStatus,
    previousStatus: ErrandStatus,
    actorSub: string,
    actorType: 'user' | 'courier' | 'system',
    requesterSub?: string,
  ): Promise<void> {
    const payload: ErrandEventPayload = {
      errandId,
      errandStatus: newStatus,
      previousStatus,
      actorSub,
      actorType,
      requesterSub,
    }

    await publishEvent(ErrandTopics.ERRAND_EVENTS, ErrandEventTypes.ERRAND_STATUS_CHANGED, payload)
  }

  async publishErrandCompleted(
    errandId: string,
    payload: {
      requesterSub: string
      courierSub: string
    },
  ): Promise<void> {
    const event: ErrandEvent = {
      eventId: crypto.randomUUID(),
      eventType: ErrandEventTypes.ERRAND_COMPLETED,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        errandId,
        requesterSub: payload.requesterSub,
        courierSub: payload.courierSub,
      },
    }

    await publishEvent(ErrandTopics.ERRAND_EVENTS, ErrandEventTypes.ERRAND_COMPLETED, event.payload)
  }

  async publishErrandCancelled(
    errandId: string,
    actorSub: string,
    reason?: string,
    requesterSub?: string,
  ): Promise<void> {
    const payload: ErrandEventPayload = {
      errandId,
      actorSub,
    }
    if (reason !== undefined) payload.reason = reason
    if (requesterSub !== undefined) payload.requesterSub = requesterSub

    await publishEvent(ErrandTopics.ERRAND_EVENTS, ErrandEventTypes.ERRAND_CANCELLED, payload)
  }

  async publishErrandExpired(errandId: string): Promise<void> {
    await publishEvent(ErrandTopics.ERRAND_EVENTS, ErrandEventTypes.ERRAND_EXPIRED, { errandId })
  }
}
