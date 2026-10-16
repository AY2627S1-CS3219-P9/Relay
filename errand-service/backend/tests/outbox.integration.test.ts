import { describe, expect, it } from 'vitest'
import { PrismaClient } from '@relay/errand-prisma'
import type { CreateErrandRequest } from '@relay/contracts'
import { ErrandRepository } from '../src/repositories/errand.repository.js'

const request: CreateErrandRequest = {
  name: 'Outbox test',
  supplierDetails: { supplierId: 'supplier', supplierName: 'Supplier', serviceType: 1 },
  pickupLocation: { lat: 1, lng: 103, buildingName: 'Pickup', floorNumber: 1 },
  targetLocation: { lat: 1, lng: 103, buildingName: 'Target', floorNumber: 2 },
  deliveryDetails: { description: 'Deliver parcel' },
  creditAmount: 10,
}
const enabled = process.env.RUN_OUTBOX_INTEGRATION === '1'

describe.skipIf(!enabled)('transactional errand outbox', () => {
  it('stores lifecycle payloads alongside their errand changes', async () => {
    const prisma = new PrismaClient()
    const repository = new ErrandRepository(prisma)
    const id = await repository.createPending('requester')
    try {
      await repository.completePending(id, 'requester', request)
      await repository.assignCourier(id, 'courier')
      await repository.pickUp(id, 'courier')
      await repository.deliver(id, 'courier')
      await repository.confirm(id)
      const row = await prisma.errand.findUniqueOrThrow({ where: { id } })
      const events = await prisma.errandEventOutbox.findMany({
        where: { payload: { path: ['errandId'], equals: id } },
        orderBy: { createdAt: 'asc' },
      })
      expect(row.status).toBe('CONFIRMED')
      expect(events.map((event) => event.eventType)).toEqual([
        'ErrandCreated', 'ErrandStatusChanged', 'ErrandStatusChanged',
        'ErrandStatusChanged', 'ErrandCompleted',
      ])
      expect(events[0].payload).toMatchObject({
        errandId: id, requesterSub: 'requester', supplierId: 'supplier', creditAmount: 10,
      })
      expect(events[1].payload).toMatchObject({
        errandStatus: 'ACCEPTED', previousStatus: 'OPEN', actorSub: 'courier', actorType: 'courier',
      })
      expect(events[4].payload).toMatchObject({
        requesterSub: 'requester', courierSub: 'courier',
      })
      await repository.deleteErrand(id, 'requester')
      expect(await prisma.errand.findUnique({ where: { id } })).toBeNull()
      expect(await prisma.errandEventOutbox.count({
        where: { payload: { path: ['errandId'], equals: id }, eventType: 'ErrandDeleted' },
      })).toBe(1)
    } finally {
      await prisma.errandEventOutbox.deleteMany({
        where: { payload: { path: ['errandId'], equals: id } },
      })
      await prisma.errand.deleteMany({ where: { id } })
      await prisma.pendingErrand.deleteMany({ where: { id } })
      await prisma.$disconnect()
    }
  })
  it('preserves cancellation and expiry payload differences', async () => {
    const prisma = new PrismaClient()
    const repository = new ErrandRepository(prisma)
    const cancelId = await repository.createPending('requester')
    const expiryId = await repository.createPending('requester')
    try {
      await repository.completePending(cancelId, 'requester', request)
      await repository.assignCourier(cancelId, 'courier')
      await repository.cancel(cancelId, 'requester')
      await repository.completePending(expiryId, 'requester', request)
      await repository.assignCourier(expiryId, 'courier')
      await repository.dropCourier(expiryId, 'EXPIRED', 'courier')
      const cancelled = await prisma.errandEventOutbox.findFirstOrThrow({
        where: { eventType: 'ErrandCancelled', payload: { path: ['errandId'], equals: cancelId } },
      })
      expect(cancelled.payload).toMatchObject({
        errandId: cancelId, actorSub: 'requester', requesterSub: 'requester',
      })
      const expiredEvents = await prisma.errandEventOutbox.findMany({
        where: { payload: { path: ['errandId'], equals: expiryId } },
        orderBy: { createdAt: 'asc' },
      })
      expect(expiredEvents.map((event) => event.eventType).slice(-2)).toEqual([
        'ErrandStatusChanged', 'ErrandExpired',
      ])
      expect(expiredEvents.at(-2)?.payload).toMatchObject({
        errandStatus: 'EXPIRED', previousStatus: 'ACCEPTED',
        actorSub: 'courier', actorType: 'courier',
      })
      expect(expiredEvents.at(-1)?.payload).toEqual({ errandId: expiryId })
    } finally {
      for (const id of [cancelId, expiryId]) {
        await prisma.errandEventOutbox.deleteMany({
          where: { payload: { path: ['errandId'], equals: id } },
        })
      }
      await prisma.errand.deleteMany({ where: { id: { in: [cancelId, expiryId] } } })
      await prisma.pendingErrand.deleteMany({ where: { id: { in: [cancelId, expiryId] } } })
      await prisma.$disconnect()
    }
  })
  it('records automatic expiry and prunes only published outbox rows', async () => {
    const prisma = new PrismaClient()
    const repository = new ErrandRepository(prisma)
    const id = await repository.createPending('requester')
    const oldId = crypto.randomUUID()
    const pendingId = crypto.randomUUID()
    try {
      await repository.completePending(id, 'requester', {
        ...request, expiresAt: '2000-01-01T00:00:00.000Z',
      })
      expect(await repository.expireOpenErrands(new Date('2000-01-02T00:00:00.000Z'))).toBe(1)
      expect((await prisma.errand.findUniqueOrThrow({ where: { id } })).status).toBe('EXPIRED')
      expect(await prisma.errandEventOutbox.count({
        where: { eventType: 'ErrandExpired', payload: { path: ['errandId'], equals: id } },
      })).toBe(1)
      await prisma.errandEventOutbox.createMany({ data: [
        { id: oldId, eventType: 'ErrandDeleted', payload: { errandId: id },
          publishedAt: new Date('1999-01-01T00:00:00.000Z') },
        { id: pendingId, eventType: 'ErrandDeleted', payload: { errandId: id } },
      ] })
      await repository.deleteOldPublishedEvents(new Date('2000-01-01T00:00:00.000Z'))
      expect(await prisma.errandEventOutbox.findUnique({ where: { id: oldId } })).toBeNull()
      expect(await prisma.errandEventOutbox.findUnique({ where: { id: pendingId } })).not.toBeNull()
    } finally {
      await prisma.errandEventOutbox.deleteMany({
        where: { payload: { path: ['errandId'], equals: id } },
      })
      await prisma.errand.deleteMany({ where: { id } })
      await prisma.pendingErrand.deleteMany({ where: { id } })
      await prisma.$disconnect()
    }
  })

})
