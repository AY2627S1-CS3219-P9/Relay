import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ServerResponse } from 'node:http'
import { ErrandNotificationTypes } from '@relay/contracts'
import { ErrandNotificationEventStream } from '../src/services/notificationEventStream.js'
import { processErrandEvent } from '../src/app.js'

// Mock types
type MockServerResponse = Partial<ServerResponse> & {
  write: vi.Mock
}

describe('processErrandEvent', () => {
  let eventStream: ErrandNotificationEventStream
  let mockResponse: MockServerResponse

  beforeEach(() => {
    eventStream = new ErrandNotificationEventStream()
    mockResponse = { write: vi.fn(), end: vi.fn() }
  })

  it('should process ERRAND_STATUS_CHANGED event and publish to subscribers', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-123',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-456',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        actorSub: 'courier-sub',
        actorType: 'user',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    // Subscribe the requester
    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    // Verify the notification was published
    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        eventId: 'evt-123',
        type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED,
        errandId: 'errand-456',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }),
    )

    // Verify the SSE was written
    expect(mockResponse.write).toHaveBeenCalledOnce()
    const writtenData = JSON.parse(mockResponse.write.mock.calls[0][0].slice(5, -2)) // Remove "data: " prefix and "\n\n" suffix
    expect(writtenData).toMatchObject({
      type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED,
      errandId: 'errand-456',
      oldStatus: 'OPEN',
      newStatus: 'ACCEPTED',
    })
  })

  it('should process ERRAND_COMPLETED event and map to ERRAND_STATUS_CHANGED SSE', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-456',
      eventType: 'ErrandCompleted',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-789',
        errandStatus: 'CONFIRMED',
        previousStatus: 'DELIVERED',
        requesterSub: 'requester-sub',
        courierSub: 'courier-sub',
        recipientSubs: ['courier-sub'],
      },
    }

    eventStream.subscribe('courier-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['courier-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED, // Should map to STATUS_CHANGED
        errandId: 'errand-789',
        oldStatus: 'DELIVERED',
        newStatus: 'CONFIRMED',
      }),
    )
  })

  it('should process ERRAND_CREATED event and map to ERRAND_CREATED SSE', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-789',
      eventType: 'ErrandCreated',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-101',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_CREATED,
        errandId: 'errand-101',
        // ERRAND_CREATED has no oldStatus/newStatus fields
      }),
    )

    // Verify the notification has no status fields
    const writtenData = JSON.parse(mockResponse.write.mock.calls[0][0].slice(5, -2))
    expect(writtenData).toMatchObject({
      type: ErrandNotificationTypes.ERRAND_CREATED,
      errandId: 'errand-101',
    })
    expect(writtenData).not.toHaveProperty('oldStatus')
    expect(writtenData).not.toHaveProperty('newStatus')
  })

  it('should process ERRAND_DELETED event and map to ERRAND_DELETED SSE', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-abc',
      eventType: 'ErrandDeleted',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-202',
        errandStatus: 'DELETED',
        previousStatus: 'CONFIRMED',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_DELETED,
        errandId: 'errand-202',
      }),
    )
  })

  it('should skip event if recipientSubs is missing', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const event = {
      eventId: 'evt-missing',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-303',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        // Missing recipientSubs
      },
    }

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing valid recipientSubs'),
      expect.anything(),
    )

    consoleWarnSpy.mockRestore()
  })

  it('should skip event if recipientSubs is empty array', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const event = {
      eventId: 'evt-empty',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-303',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: [], // Empty array
      },
    }

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing valid recipientSubs'),
      expect.anything(),
    )

    consoleWarnSpy.mockRestore()
  })

  it('should skip event if errandStatus is missing', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const event = {
      eventId: 'evt-no-status',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-303',
        // Missing errandStatus
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing errandStatus'),
      expect.anything(),
    )

    consoleWarnSpy.mockRestore()
  })

  it('should skip event if previousStatus is missing', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const event = {
      eventId: 'evt-no-previous',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-303',
        errandStatus: 'ACCEPTED',
        // Missing previousStatus
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing previousStatus'),
      expect.anything(),
    )

    consoleWarnSpy.mockRestore()
  })

  it('should process multiple events in sequence', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    // Subscribe both users
    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    const event1 = {
      eventId: 'evt-1',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-1',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    const event2 = {
      eventId: 'evt-2',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:01:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-2',
        errandStatus: 'PICKED_UP',
        previousStatus: 'ACCEPTED',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    await processErrandEvent(eventStream, event1)
    await processErrandEvent(eventStream, event2)

    expect(notificationStreamWriteSpy).toHaveBeenCalledTimes(2)
  })

  it('should log event processing', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const event = {
      eventId: 'evt-test',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-test',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Processing event evt-test of type ErrandStatusChanged for errand errand-test',
    )

    consoleLogSpy.mockRestore()
  })

  // ===== CORNER CASES AND REAL-WORLD SCENARIOS =====

  it('should notify ALL subscribers when system triggers event (no actorSub)', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-system-expire',
      eventType: 'ErrandExpired',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-expired',
        errandStatus: 'EXPIRED',
        previousStatus: 'ACCEPTED',
        actorType: 'system',
        requesterSub: 'requester-sub',
        // No actorSub since system triggered it
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED,
        errandId: 'errand-expired',
        oldStatus: 'ACCEPTED',
        newStatus: 'EXPIRED',
      }),
    )
  })

  it('should handle actor being excluded (actor not in recipientSubs)', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-actor-excluded',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-excluded',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        actorSub: 'courier-sub',
        actorType: 'user',
        requesterSub: 'requester-sub',
        courierSub: 'courier-sub',
        recipientSubs: ['requester-sub'], // Courier (actor) correctly excluded
      },
    }

    // Subscribe both with different mock responses
    const mockCourierResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse
    const mockRequesterResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse
    eventStream.subscribe('courier-sub', mockCourierResponse as ServerResponse)
    eventStream.subscribe('requester-sub', mockRequesterResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    // Only requester gets notification, not the courier (actor)
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(['requester-sub'], expect.anything())
    // Courier's subscriptions should NOT be written to
    expect(mockCourierResponse.write).not.toHaveBeenCalled()
    // Requester should get notification
    expect(mockRequesterResponse.write).toHaveBeenCalledOnce()
  })

  it('should send multiple notifications to same user for different errands', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event1 = {
      eventId: 'evt-multi-1',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-1',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'user-1',
        recipientSubs: ['user-1'],
      },
    }

    const event2 = {
      eventId: 'evt-multi-2',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:01:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-2',
        errandStatus: 'PICKED_UP',
        previousStatus: 'ACCEPTED',
        requesterSub: 'user-1',
        recipientSubs: ['user-1'],
      },
    }

    eventStream.subscribe('user-1', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event1)
    await processErrandEvent(eventStream, event2)

    expect(notificationStreamWriteSpy).toHaveBeenCalledTimes(2)
    expect(mockResponse.write).toHaveBeenCalledTimes(2)
  })

  it('should handle recipientSubs with multiple users correctly', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-multi-recipient',
      eventType: 'ErrandDeleted',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-deleted',
        errandStatus: 'DELETED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        courierSub: 'courier-sub',
        recipientSubs: ['requester-sub', 'courier-sub'], // Both get notified
      },
    }

    const mockCourierResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse
    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)
    eventStream.subscribe('courier-sub', mockCourierResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub', 'courier-sub'],
      expect.anything(),
    )
    expect(mockResponse.write).toHaveBeenCalledOnce()
    expect(mockCourierResponse.write).toHaveBeenCalledOnce()
  })

  it('should process ERRAND_CANCELLED event', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-cancel',
      eventType: 'ErrandCancelled',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-cancelled',
        errandStatus: 'CANCELLED',
        previousStatus: 'ACCEPTED',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED,
        errandId: 'errand-cancelled',
        oldStatus: 'ACCEPTED',
        newStatus: 'CANCELLED',
      }),
    )
  })

  it('should process ERRAND_EXPIRED event', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-expire',
      eventType: 'ErrandExpired',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-expired',
        errandStatus: 'EXPIRED',
        previousStatus: 'ACCEPTED',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub'],
      expect.objectContaining({
        type: ErrandNotificationTypes.ERRAND_STATUS_CHANGED,
        errandId: 'errand-expired',
        oldStatus: 'ACCEPTED',
        newStatus: 'EXPIRED',
      }),
    )
  })

  it('should handle duplicate event IDs (idempotent processing)', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-duplicate',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-dup',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    // Process same event twice (simulating duplicate message)
    await processErrandEvent(eventStream, event)
    await processErrandEvent(eventStream, event)

    // Should send notifications both times (idempotent at app level)
    expect(notificationStreamWriteSpy).toHaveBeenCalledTimes(2)
    expect(mockResponse.write).toHaveBeenCalledTimes(2)
  })

  it('should handle null/undefined actorSub field', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-null-actor',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-actor',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        actorSub: null, // Edge case: null actorSub
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    expect(mockResponse.write).toHaveBeenCalledOnce()
  })

  it('should handle empty string in recipientSubs array', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const event = {
      eventId: 'evt-empty-string',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-empty',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub', ''], // Has empty string
      },
    }

    const mockEmptyResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse
    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)
    eventStream.subscribe('', mockEmptyResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    // Should still work for valid recipient
    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      ['requester-sub', ''],
      expect.anything(),
    )
    expect(mockResponse.write).toHaveBeenCalledOnce()
    expect(mockEmptyResponse.write).toHaveBeenCalledOnce()

    consoleWarnSpy.mockRestore()
  })

  it('should handle very long event ID', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const longId = 'x'.repeat(1000) // 1000 char ID

    const event = {
      eventId: longId,
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'errand-long',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    const writtenData = JSON.parse(mockResponse.write.mock.calls[0][0].slice(5, -2))
    expect(writtenData.eventId).toBe(longId)
  })

  it('should handle very long errandId in payload', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
    const longErrandId = 'y'.repeat(1000) // 1000 char errandId

    const event = {
      eventId: 'evt-long-errand',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: 1,
      payload: {
        errandId: longErrandId,
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
    const writtenData = JSON.parse(mockResponse.write.mock.calls[0][0].slice(5, -2))
    expect(writtenData.errandId).toBe(longErrandId)
  })

  it('should handle rapid succession events (stress test)', async () => {
    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    const numEvents = 100
    for (let i = 0; i < numEvents; i++) {
      const event = {
        eventId: `evt-rapid-${i}`,
        eventType: 'ErrandStatusChanged',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          errandId: `errand-rapid-${i}`,
          errandStatus: 'ACCEPTED',
          previousStatus: 'OPEN',
          requesterSub: 'requester-sub',
          recipientSubs: ['requester-sub'],
        },
      }
      await processErrandEvent(eventStream, event)
    }

    expect(notificationStreamWriteSpy).toHaveBeenCalledTimes(numEvents)
    expect(mockResponse.write).toHaveBeenCalledTimes(numEvents)
  })

  it('should preserve original timestamp in notification', async () => {
    const originalTimestamp = '2024-06-15T14:30:45.123Z'

    const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')

    const event = {
      eventId: 'evt-timestamp',
      eventType: 'ErrandStatusChanged',
      timestamp: originalTimestamp,
      version: 1,
      payload: {
        errandId: 'errand-ts',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        requesterSub: 'requester-sub',
        recipientSubs: ['requester-sub'],
      },
    }

    eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

    await processErrandEvent(eventStream, event)

    expect(notificationStreamWriteSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: 'evt-timestamp',
        timestamp: originalTimestamp,
      }),
    )
  })

  it('should handle all valid status values', async () => {
    const validStatuses = ['OPEN', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CONFIRMED']

    for (const newStatus of validStatuses) {
      const notificationStreamWriteSpy = vi.spyOn(eventStream, 'publish')
      mockResponse.write.mockClear()

      const event = {
        eventId: `evt-status-${newStatus}`,
        eventType: 'ErrandStatusChanged',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: 1,
        payload: {
          errandId: `errand-${newStatus}`,
          errandStatus: newStatus,
          previousStatus: 'OPEN',
          requesterSub: 'requester-sub',
          recipientSubs: ['requester-sub'],
        },
      }

      eventStream.subscribe('requester-sub', mockResponse as ServerResponse)

      await processErrandEvent(eventStream, event)

      expect(notificationStreamWriteSpy).toHaveBeenCalledOnce()
      const writtenData = JSON.parse(mockResponse.write.mock.calls[0][0].slice(5, -2))
      expect(writtenData.newStatus).toBe(newStatus)

      vi.clearAllMocks()
    }
  })

  it('END-TO-END: Verify SSE data format and notification structure match contracts', async () => {
    // This test verifies the actual flow from event processing to SSE output
    // It uses real objects and verifies the data format matches what a browser would receive

    const eventStream = new ErrandNotificationEventStream()
    const mockResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse

    // Simulate a real Kafka event coming from errand-service
    const kafkaEvent = {
      eventId: 'real-kafka-event-123',
      eventType: 'ErrandStatusChanged',
      timestamp: '2024-06-15T10:30:00.000Z',
      version: 1,
      payload: {
        errandId: 'real-errand-abc',
        errandStatus: 'ACCEPTED',
        previousStatus: 'OPEN',
        actorSub: 'user-456',
        actorType: 'user',
        requesterSub: 'user-789',
        courierSub: 'user-456',
        recipientSubs: ['user-789'], // Requester gets notification, courier (actor) excluded
      },
    }

    // Subscribe the user
    eventStream.subscribe('user-789', mockResponse as ServerResponse)

    // Process the event (this is what happens when consumer receives from Kafka)
    await processErrandEvent(eventStream, kafkaEvent)

    // Verify publish was called with the correct recipients
    expect(eventStream.getSubscribers('user-789')).toBeDefined()

    // Verify the actual SSE data format matches the expected contract
    expect(mockResponse.write).toHaveBeenCalledOnce()
    const sseData = mockResponse.write.mock.calls[0][0]

    // Verify SSE format: "data: {json}\n\n"
    expect(sseData).toMatch(/^data: \{.*\}\n\n$/)

    // Extract the JSON from the SSE data
    const jsonPayload = JSON.parse(sseData.slice(5, -2))

    // Verify the notification structure matches ErrandNotification contract
    expect(jsonPayload).toMatchObject({
      eventId: 'real-kafka-event-123',
      type: 'ERRAND_STATUS_CHANGED',
      errandId: 'real-errand-abc',
      timestamp: '2024-06-15T10:30:00.000Z',
      oldStatus: 'OPEN',
      newStatus: 'ACCEPTED',
    })

    // Verify no extra properties that shouldn't be there
    // Keys are sorted alphabetically: errandId, eventId, newStatus, oldStatus, timestamp, type
    const actualKeys = Object.keys(jsonPayload).sort()
    expect(actualKeys).toEqual([
      'errandId',
      'eventId',
      'newStatus',
      'oldStatus',
      'timestamp',
      'type',
    ])
  })

  it('END-TO-END: Verify ERRAND_CREATED has no status fields in SSE', async () => {
    const eventStream = new ErrandNotificationEventStream()
    const mockResponse = { write: vi.fn(), end: vi.fn() } as MockServerResponse

    const kafkaEvent = {
      eventId: 'created-event-xyz',
      eventType: 'ErrandCreated',
      timestamp: '2024-06-15T11:00:00.000Z',
      version: 1,
      payload: {
        errandId: 'new-errand-123',
        requesterSub: 'user-requester',
        recipientSubs: ['user-requester'],
      },
    }

    eventStream.subscribe('user-requester', mockResponse as ServerResponse)
    await processErrandEvent(eventStream, kafkaEvent)

    const sseData = mockResponse.write.mock.calls[0][0]
    const jsonPayload = JSON.parse(sseData.slice(5, -2))

    // ERRAND_CREATED should NOT have oldStatus or newStatus
    expect(jsonPayload.type).toBe('ERRAND_CREATED')
    expect(jsonPayload.errandId).toBe('new-errand-123')
    expect(jsonPayload).not.toHaveProperty('oldStatus')
    expect(jsonPayload).not.toHaveProperty('newStatus')

    // Verify the exact properties present (check all expected keys exist and no extras)
    // Order is: eventId, type, errandId, timestamp (from notification object construction)
    const actualKeys = Object.keys(jsonPayload)
    expect(actualKeys).toEqual(['eventId', 'type', 'errandId', 'timestamp'])
    expect(actualKeys.length).toBe(4)
  })
})
