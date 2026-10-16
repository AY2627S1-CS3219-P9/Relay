import { describe, expect, it, vi } from 'vitest'
import type { ErrandRepository } from '../src/repositories/errand.repository.js'
import { PendingErrandWorker } from '../src/workers/pending-errand.worker.js'
import type { EventBus } from '../src/kafka/eventBus.js'

describe('pending errand recovery worker', () => {
  it('scans 30-second-old rows and publishes outbox events with stable IDs', async () => {
    const repository = {
      recoverExpiredPending: vi.fn().mockResolvedValue(1),
      unpublishedEvents: vi.fn().mockResolvedValue([{
        id: 'event-id', eventType: 'ErrandCreationFailed',
        payload: { errandId: 'errand-id', requesterSub: 'requester' },
      }]),
      markEventPublished: vi.fn().mockResolvedValue(undefined),
    }
    const eventBus = { publishStoredEvent: vi.fn().mockResolvedValue(undefined) }
    const worker = new PendingErrandWorker(repository as unknown as ErrandRepository, eventBus as unknown as EventBus)
    await worker.runOnce(new Date('2026-10-16T12:00:00.000Z'))
    expect(repository.recoverExpiredPending).toHaveBeenCalledWith(new Date('2026-10-16T11:59:30.000Z'))
    expect(eventBus.publishStoredEvent).toHaveBeenCalledWith(
      'event-id',
      'ErrandCreationFailed',
      { errandId: 'errand-id', requesterSub: 'requester' },
    )
    expect(repository.markEventPublished).toHaveBeenCalledWith('event-id')
  })

  it('retains an unpublished event when Kafka publish fails', async () => {
    const repository = {
      recoverExpiredPending: vi.fn().mockResolvedValue(0),
      unpublishedEvents: vi.fn().mockResolvedValue([{
        id: 'event-id', eventType: 'ErrandCreationFailed', payload: { errandId: 'errand-id' },
      }]),
      markEventPublished: vi.fn(),
    }
    const eventBus = { publishStoredEvent: vi.fn().mockRejectedValueOnce(new Error('Kafka unavailable')) }
    const worker = new PendingErrandWorker(repository as unknown as ErrandRepository, eventBus as unknown as EventBus)
    await expect(worker.runOnce()).rejects.toThrow('Kafka unavailable')
    expect(repository.markEventPublished).not.toHaveBeenCalled()
  })
})
