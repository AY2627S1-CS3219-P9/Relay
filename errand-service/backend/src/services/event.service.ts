import { type Errand, ErrandEventTypes } from '@relay/contracts'
import { EventBus } from '../kafka/eventBus.js'

/**
 * Event service for publishing errand lifecycle events.
 */
export class EventService {
  private readonly eventBus: EventBus

  constructor() {
    this.eventBus = new EventBus()
  }

  async onErrandCreated(errand: Errand): Promise<void> {
    await this.eventBus.publishErrandCreated(errand.id, {
      requesterSub: errand.requesterSub,
      supplierId: errand.supplierId ?? undefined,
      creditAmount: errand.creditAmount,
      expiresAt: errand.expiresAt,
    })
  }

  async onErrandStatusChanged(
    errandId: string,
    newStatus: string,
    previousStatus: string,
    actorSub: string,
    actorType: 'user' | 'courier' | 'system',
    requesterSub?: string,
  ): Promise<void> {
    await this.eventBus.publishErrandStatusChanged(
      errandId,
      newStatus as any,
      previousStatus as any,
      actorSub,
      actorType,
      requesterSub,
    )
  }

  async onErrandCompleted(errand: Errand): Promise<void> {
    if (!errand.courierSub) {
      console.warn(`Errand ${errand.id} has no courier assigned for completion`)
      return
    }

    await this.eventBus.publishErrandCompleted(errand.id, {
      requesterSub: errand.requesterSub,
      courierSub: errand.courierSub,
    })
  }

  async onErrandCancelled(
    errandId: string,
    actorSub: string,
    reason?: string,
    requesterSub?: string,
  ): Promise<void> {
    await this.eventBus.publishErrandCancelled(errandId, actorSub, reason, requesterSub)
  }

  async onErrandExpired(errandId: string): Promise<void> {
    await this.eventBus.publishErrandExpired(errandId)
  }
}
