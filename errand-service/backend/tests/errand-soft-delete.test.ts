import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ErrandRepository } from '../src/repositories/errand.repository.js'
import { ErrandStatus } from '@relay/contracts'
import { PrismaClient } from '@relay/errand-prisma'

const prisma = new PrismaClient()

describe('errand delete - soft delete with pending errands', () => {
  const repo = new ErrandRepository(prisma)

  beforeAll(async () => {
    await prisma.errand.deleteMany({})
    await prisma.pendingErrand.deleteMany({})
  })

  afterAll(async () => {
    await prisma.errand.deleteMany({})
    await prisma.pendingErrand.deleteMany({})
    await prisma.$disconnect()
  })

  it('should handle non-existent errands gracefully (returns empty list)', async () => {
    // Generate valid UUIDs that don't exist
    const id1 = await repo.addPendingErrand('requester')
    const id2 = await repo.addPendingErrand('requester')

    // Delete them so they don't exist anymore
    await prisma.errand.deleteMany({ where: { id: { in: [id1, id2] } } })
    await prisma.pendingErrand.deleteMany({ where: { id: { in: [id1, id2] } } })

    // Try to delete errands that don't exist - should return empty list (not throw)
    const result = await repo.deleteOpenOrAcceptedErrandsBySupplier('non-existent-supplier')
    expect(result.deletedErrandIds).toEqual([])
  })

  it('should create outbox events for each deleted errand', async () => {
    const supplierId = `supplier-${Date.now()}`
    const requesterSub1 = `requester-${Date.now()}-1`
    const requesterSub2 = `requester-${Date.now()}-2`
    const errandId1 = await repo.addPendingErrand(requesterSub1)
    const errandId2 = await repo.addPendingErrand(requesterSub2)

    // Delete pending errands and create errands directly
    await prisma.pendingErrand.deleteMany({ where: { id: { in: [errandId1, errandId2] } } })
    await prisma.errand.createMany({
      data: [
        {
          id: errandId1,
          requesterSub: requesterSub1,
          courierSub: null,
          supplierId,
          name: 'Test errand 1',
          pickupLat: 1.0,
          pickupLng: 103.0,
          pickupBuildingName: 'Pickup',
          pickupFloorNumber: 1,
          targetLat: 1.0,
          targetLng: 103.0,
          targetBuildingName: 'Target',
          targetFloorNumber: 2,
          supplierName: 'Test Supplier',
          serviceType: 1,
          deliveryDescription: 'Test delivery',
          creditAmount: 10,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: ErrandStatus.Open,
        },
        {
          id: errandId2,
          requesterSub: requesterSub2,
          courierSub: `courier-${supplierId}`,
          supplierId,
          name: 'Test errand 2',
          pickupLat: 1.0,
          pickupLng: 103.0,
          pickupBuildingName: 'Pickup',
          pickupFloorNumber: 1,
          targetLat: 1.0,
          targetLng: 103.0,
          targetBuildingName: 'Target',
          targetFloorNumber: 2,
          supplierName: 'Test Supplier',
          serviceType: 1,
          deliveryDescription: 'Test delivery',
          creditAmount: 10,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: ErrandStatus.Accepted,
        },
      ],
    })

    // Simulate supplier deactivation
    await repo.deleteOpenOrAcceptedErrandsBySupplier(supplierId)

    // Verify outbox events have correct requesterSub in payload
    const event1 = await prisma.errandEventOutbox.findFirst({
      where: { payload: { path: ['errandId'], equals: errandId1 }, eventType: 'ErrandDeleted' },
    })
    const event2 = await prisma.errandEventOutbox.findFirst({
      where: { payload: { path: ['errandId'], equals: errandId2 }, eventType: 'ErrandDeleted' },
    })
    expect(event1).not.toBeNull()
    expect(event2).not.toBeNull()
    expect(event1?.payload?.requesterSub).toBe(requesterSub1)
    expect(event2?.payload?.requesterSub).toBe(requesterSub2)

    // Verify errands are now DELETED
    const errand1 = await prisma.errand.findUnique({ where: { id: errandId1 } })
    const errand2 = await prisma.errand.findUnique({ where: { id: errandId2 } })
    expect(errand1?.status).toBe(ErrandStatus.Deleted)
    expect(errand2?.status).toBe(ErrandStatus.Deleted)
  })
})
