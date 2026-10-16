import { ErrandEventTypes, type ErrandEventPayload, type ErrandEventType, type ErrandStatus } from '@relay/contracts'
import { publishEvent } from './producer.js'

/** Publishes errand lifecycle events to the topic provisioned by kafka-init. */
export class EventBus {
  async publishStoredEvent(id: string, eventType: ErrandEventType, payload: ErrandEventPayload): Promise<void> {
    await publishEvent(eventType, payload, id)
  }

  async publishErrandCreated(
    errandId: string,
    payload: {
      requesterSub: string
      supplierId?: string
      creditAmount: number
      expiresAt: string
    },
  ): Promise<void> {
    await publishEvent(ErrandEventTypes.ERRAND_CREATED, {
      errandId,
      requesterSub: payload.requesterSub,
      supplierId: payload.supplierId,
      creditAmount: payload.creditAmount,
      expiresAt: payload.expiresAt,
    })
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
    await publishEvent(ErrandEventTypes.ERRAND_STATUS_CHANGED, payload)
  }

  async publishErrandCompleted(
    errandId: string,
    payload: { requesterSub: string; courierSub: string },
  ): Promise<void> {
    await publishEvent(ErrandEventTypes.ERRAND_COMPLETED, {
      errandId,
      requesterSub: payload.requesterSub,
      courierSub: payload.courierSub,
    })
  }

  async publishErrandCancelled(
    errandId: string,
    actorSub: string,
    reason?: string,
    requesterSub?: string,
  ): Promise<void> {
    const payload: ErrandEventPayload = { errandId, actorSub }
    if (reason !== undefined) payload.reason = reason
    if (requesterSub !== undefined) payload.requesterSub = requesterSub
    await publishEvent(ErrandEventTypes.ERRAND_CANCELLED, payload)
  }

  async publishErrandExpired(errandId: string): Promise<void> {
    await publishEvent(ErrandEventTypes.ERRAND_EXPIRED, { errandId })
  }

  async publishErrandDeleted(errandId: string, requesterSub: string): Promise<void> {
    await publishEvent(ErrandEventTypes.ERRAND_DELETED, { errandId, requesterSub })
  }
}
