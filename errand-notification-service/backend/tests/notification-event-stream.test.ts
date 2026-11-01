import { describe, expect, it, vi, beforeEach } from 'vitest'
import { type ServerResponse } from 'node:http'
import type { ErrandNotification, ErrandNotificationType } from '@relay/contracts'
import { ErrandNotificationEventStream } from '../src/services/notificationEventStream.js'
import { ErrandNotificationTypes } from '@relay/contracts'

// Mock types
type MockServerResponse = Partial<ServerResponse> & {
  write: vi.Mock
}

describe('ErrandNotificationEventStream', () => {
  let stream: ErrandNotificationEventStream
  let mockResponse1: MockServerResponse
  let mockResponse2: MockServerResponse

  beforeEach(() => {
    stream = new ErrandNotificationEventStream()
    mockResponse1 = {
      write: vi.fn(),
      end: vi.fn(),
    }
    mockResponse2 = {
      write: vi.fn(),
      end: vi.fn(),
    }
  })

  describe('subscribe', () => {
    it('should subscribe a user and store their response', () => {
      stream.subscribe('user1', mockResponse1 as ServerResponse)

      const subscribers = stream.getSubscribers('user1')
      expect(subscribers).toBeDefined()
      expect(subscribers?.size).toBe(1)
      // Check that the Set has an object with response property matching mockResponse1
      const hasResponse = Array.from(subscribers!).some(s => s.response === mockResponse1)
      expect(hasResponse).toBe(true)
    })

    it('should handle multiple users subscribing', () => {
      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user2', mockResponse2 as ServerResponse)

      expect(stream.getSubscribers('user1')?.size).toBe(1)
      expect(stream.getSubscribers('user2')?.size).toBe(1)
    })

    it('should handle multiple subscriptions for the same user', () => {
      const mockResponse3 = { write: vi.fn(), end: vi.fn() } as MockServerResponse
      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user1', mockResponse2 as ServerResponse)
      stream.subscribe('user1', mockResponse3 as ServerResponse)

      const subscribers = stream.getSubscribers('user1')
      expect(subscribers?.size).toBe(3)
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe a user and remove their response', () => {
      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.unsubscribe('user1')

      const subscribers = stream.getSubscribers('user1')
      expect(subscribers).toBeUndefined()
    })

    it('should handle unsubscribe for non-existent user', () => {
      expect(() => stream.unsubscribe('nonexistent')).not.toThrow()
    })

    it('should keep other users when one unsubscribes', () => {
      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user2', mockResponse2 as ServerResponse)
      stream.unsubscribe('user1')

      expect(stream.getSubscribers('user1')).toBeUndefined()
      expect(stream.getSubscribers('user2')?.size).toBe(1)
    })
  })

  describe('publish', () => {
    it('should push notification to all subscribers of specified users', () => {
      const notification: ErrandNotification = {
        eventId: 'evt-123',
        type: 'ERRAND_STATUS_CHANGED' as ErrandNotificationType,
        errandId: 'errand-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }

      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user2', mockResponse2 as ServerResponse)

      stream.publish(['user1', 'user2'], notification)

      expect(mockResponse1.write).toHaveBeenCalledOnce()
      expect(mockResponse2.write).toHaveBeenCalledOnce()

      const writtenData1 = mockResponse1.write.mock.calls[0][0]
      const writtenData2 = mockResponse2.write.mock.calls[0][0]

      // Remove "data: " prefix and "\n\n" suffix to get JSON
      const payload1 = JSON.parse(writtenData1.slice(5, -2))
      const payload2 = JSON.parse(writtenData2.slice(5, -2))

      expect(payload1).toMatchObject(notification)
      expect(payload2).toMatchObject(notification)
    })

    it('should only push to specified users, not all subscribers', () => {
      const notification: ErrandNotification = {
        eventId: 'evt-123',
        type: 'ERRAND_STATUS_CHANGED' as ErrandNotificationType,
        errandId: 'errand-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }

      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user2', mockResponse2 as ServerResponse)

      // Only notify user1
      stream.publish(['user1'], notification)

      expect(mockResponse1.write).toHaveBeenCalledOnce()
      expect(mockResponse2.write).not.toHaveBeenCalled()
    })

    it('should skip non-existent users without error', () => {
      const notification: ErrandNotification = {
        eventId: 'evt-123',
        type: 'ERRAND_STATUS_CHANGED' as ErrandNotificationType,
        errandId: 'errand-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }

      stream.subscribe('user1', mockResponse1 as ServerResponse)
      // user2 is not subscribed

      stream.publish(['user1', 'user2', 'user3'], notification)

      expect(mockResponse1.write).toHaveBeenCalledOnce()
      // Should not throw for non-existent users
    })

    it('should send correct data format', () => {
      const notification: ErrandNotification = {
        eventId: 'evt-123',
        type: 'ERRAND_STATUS_CHANGED' as ErrandNotificationType,
        errandId: 'errand-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }

      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.publish(['user1'], notification)

      const writtenData = mockResponse1.write.mock.calls[0][0]
      expect(writtenData).toBe(`data: ${JSON.stringify(notification)}\n\n`)
    })

    it('should send to all subscribed responses for a user', () => {
      const notification: ErrandNotification = {
        eventId: 'evt-123',
        type: 'ERRAND_STATUS_CHANGED' as ErrandNotificationType,
        errandId: 'errand-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        oldStatus: 'OPEN',
        newStatus: 'ACCEPTED',
      }

      const mockResponse3 = { write: vi.fn(), end: vi.fn() } as MockServerResponse

      // Subscribe same user twice (multiple SSE connections)
      stream.subscribe('user1', mockResponse1 as ServerResponse)
      stream.subscribe('user1', mockResponse2 as ServerResponse)
      stream.subscribe('user1', mockResponse3 as ServerResponse)

      stream.publish(['user1'], notification)

      expect(mockResponse1.write).toHaveBeenCalledOnce()
      expect(mockResponse2.write).toHaveBeenCalledOnce()
      expect(mockResponse3.write).toHaveBeenCalledOnce()
    })
  })

  describe('getSubscribers', () => {
    it('should return undefined for non-existent user', () => {
      const subscribers = stream.getSubscribers('nonexistent')
      expect(subscribers).toBeUndefined()
    })

    it('should return Set of subscribers for existing user', () => {
      stream.subscribe('user1', mockResponse1 as ServerResponse)

      const subscribers = stream.getSubscribers('user1')
      expect(subscribers).toBeInstanceOf(Set)
      expect(subscribers?.size).toBe(1)
    })
  })
})
