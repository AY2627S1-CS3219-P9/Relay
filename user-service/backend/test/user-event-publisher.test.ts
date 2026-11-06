import { describe, expect, it, vi } from 'vitest'
import { UserEventPublisher } from '../../event-publisher/user-event-publisher.js'

describe('user outbox publisher', () => {
  it('marks sent events and prunes only old published rows', async () => {
    const outbox = {
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    }
    outbox.findMany.mockResolvedValueOnce([
      {
        id: 'event-id',
        topic: 'user-events',
        key: 'user-id',
        payload: { eventType: 'UserRegistered', payload: { cognitoSub: 'user-id' } },
      },
    ] as never)
    outbox.update.mockResolvedValueOnce({} as never)
    outbox.deleteMany.mockResolvedValueOnce({ count: 1 })
    const publisher = new UserEventPublisher({ userOutboxEvent: outbox } as never)
    const producer = {
      connect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
    }
    Object.assign(publisher, { producer })
    await publisher['flush']()
    expect(producer.send).toHaveBeenCalledWith({
      acks: -1,
      topic: 'user-events',
      messages: [
        {
          key: 'user-id',
          value: JSON.stringify({
            eventType: 'UserRegistered',
            payload: { cognitoSub: 'user-id' },
          }),
        },
      ],
    })
    expect(outbox.update).toHaveBeenCalledWith({
      where: { id: 'event-id' },
      data: { publishedAt: expect.any(Date) },
    })
    expect(outbox.deleteMany).toHaveBeenCalledWith({
      where: { publishedAt: { lt: expect.any(Date) } },
    })
    await publisher.stop()
  })
})
