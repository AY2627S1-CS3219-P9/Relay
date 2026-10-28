import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ErrandRepository } from '../src/repositories/errand.repository.js'
import { ErrandStatus } from '@relay/contracts'
import { PrismaClient } from '@relay/errand-prisma'

const prisma = new PrismaClient()

describe('errand accept - expiry edge cases', () => {
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

  async function createOpenErrandWithExpiry(requesterSub: string, expiresAt: Date, supplierId?: string): Promise<string> {
    // Create pending errand (generates proper UUID)
    const id = await repo.addPendingErrand(requesterSub)
    // Delete pending errand and create actual errand (use deleteMany to avoid errors)
    await prisma.pendingErrand.deleteMany({ where: { id } })
    await prisma.errand.create({
      data: {
        id,
        requesterSub,
        courierSub: null,
        supplierId: supplierId || `supplier-${Date.now()}-${Math.random()}-${Math.random()}`,
        name: 'Test errand',
        pickupLat: 1.0,
        pickupLng: 103.0,
        pickupBuildingName: 'Pickup Building',
        pickupFloorNumber: 1,
        targetLat: 1.0,
        targetLng: 103.0,
        targetBuildingName: 'Target Building',
        targetFloorNumber: 2,
        supplierName: 'Test Supplier',
        serviceType: 1,
        deliveryDescription: 'Test delivery',
        creditAmount: 10,
        expiresAt,
        status: ErrandStatus.Open,
      },
    })
    return id
  }

  describe('accepting expired errands', () => {
    it('should reject accepting an errand that has already expired', async () => {
      const requesterSub = `requester-${Date.now()}`
      const courierSub = `courier-${Date.now()}`
      const supplierId = `supplier-${Date.now()}`

      // Create an errand with a past expiry date
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const errandId = await createOpenErrandWithExpiry(requesterSub, past, supplierId)

      try {
        // Try to accept - should fail
        await expect(repo.accept(errandId, courierSub)).rejects.toThrow('ERRAND ALREADY EXPIRED')

        // Verify errand is still OPEN and has no courier
        const errand = await prisma.errand.findUnique({ where: { id: errandId } })
        expect(errand?.status).toBe(ErrandStatus.Open)
        expect(errand?.courierSub).toBeNull()
      } finally {
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })

    it('should reject accepting an errand with expiry exactly at current time', async () => {
      const requesterSub = `requester-${Date.now()}`
      const courierSub = `courier-${Date.now()}`
      const supplierId = `supplier-${Date.now()}`

      // Create an errand with expiry exactly at current time
      const now = new Date()
      const errandId = await createOpenErrandWithExpiry(requesterSub, now, supplierId)

      try {
        // Try to accept - should fail (expiresAt <= now means expired)
        await expect(repo.accept(errandId, courierSub)).rejects.toThrow('ERRAND ALREADY EXPIRED')

        // Verify errand is still OPEN
        const errand = await prisma.errand.findUnique({ where: { id: errandId } })
        expect(errand?.status).toBe(ErrandStatus.Open)
      } finally {
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })
  })

  describe('race condition: expiry between read and acceptance', () => {
    it('should handle concurrent expiry and acceptance (expiry wins)', async () => {
      const requesterSub = `requester-${Date.now()}`
      const courierSub = `courier-${Date.now()}`
      const supplierId = `supplier-${Date.now()}`

      // Create an errand with expiry just slightly in the future
      const verySoon = new Date(Date.now() + 100) // 100ms from now
      const errandId = await createOpenErrandWithExpiry(requesterSub, verySoon, supplierId)

      try {
        // Wait for expiry
        await new Promise((resolve) => setTimeout(resolve, 150))

        // Try to accept - should fail because errand is now expired
        await expect(repo.accept(errandId, courierSub)).rejects.toThrow(/ERRAND ALREADY EXPIRED|ERRAND NOT FOUND/)
      } finally {
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })

    it('should handle rapid expiry and acceptance (acceptance wins if fast enough)', async () => {
      const requesterSub = `requester-${Date.now()}`
      const courierSub = `courier-${Date.now()}`
      const supplierId = `supplier-${Date.now()}`

      // Create an errand with expiry 500ms in the future
      const soon = new Date(Date.now() + 500)
      const errandId = await createOpenErrandWithExpiry(requesterSub, soon, supplierId)

      try {
        // Immediately try to accept (should succeed before expiry)
        const result = await repo.accept(errandId, courierSub)
        expect(result.status).toBe(ErrandStatus.Accepted)

        // Verify errand was accepted before it could expire
        const errand = await prisma.errand.findUnique({ where: { id: errandId } })
        expect(errand?.status).toBe(ErrandStatus.Accepted)
        expect(errand?.courierSub).toBe(courierSub)
      } finally {
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })
  })

  describe('supplier deactivation with active errands', () => {
    it('should soft-delete OPEN errands when supplier becomes inactive', async () => {
      const supplierId = `supplier-${Date.now()}`
      const requesterSub = `requester-${Date.now()}`

      // Create errands using the existing helper
      const errandId1 = await repo.addPendingErrand(requesterSub)
      const errandId2 = await repo.addPendingErrand(requesterSub)

      // Delete pending errands and create actual errands
      await prisma.pendingErrand.deleteMany({ where: { id: { in: [errandId1, errandId2] } } })
      await prisma.errand.createMany({
        data: [
          {
            id: errandId1,
            requesterSub,
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
            requesterSub,
            courierSub: null,
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
            status: ErrandStatus.Open,
          },
        ],
      })

      try {
        // Simulate supplier deactivation by calling the new method
        await repo.supplierUpdateDeleteErrands([errandId1, errandId2])

        // Verify both errands are now DELETED
        const errand1 = await prisma.errand.findUnique({ where: { id: errandId1 } })
        const errand2 = await prisma.errand.findUnique({ where: { id: errandId2 } })
        expect(errand1?.status).toBe(ErrandStatus.Deleted)
        expect(errand2?.status).toBe(ErrandStatus.Deleted)

        // Verify outbox events were created for each deletion
        const event1 = await prisma.errandEventOutbox.findFirst({
          where: { payload: { path: ['errandId'], equals: errandId1 }, eventType: 'ErrandDeleted' },
        })
        const event2 = await prisma.errandEventOutbox.findFirst({
          where: { payload: { path: ['errandId'], equals: errandId2 }, eventType: 'ErrandDeleted' },
        })
        expect(event1).not.toBeNull()
        expect(event2).not.toBeNull()
        expect(event1?.payload?.requesterSub).toBe(requesterSub)
        expect(event2?.payload?.requesterSub).toBe(requesterSub)
      } finally {
        await prisma.errand.deleteMany({ where: { id: { in: [errandId1, errandId2] } } })
        await prisma.errandEventOutbox.deleteMany({})
      }
    })

    it('should soft-delete ACCEPTED errands when supplier becomes inactive', async () => {
      const supplierId = `supplier-${Date.now()}`
      const requesterSub = `requester-${Date.now()}`
      const courierSub = `courier-${supplierId}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Delete pending errand and create actual errand
      await prisma.pendingErrand.delete({ where: { id: errandId } })
      await prisma.errand.create({
        data: {
          id: errandId,
          requesterSub,
          courierSub,
          supplierId,
          name: 'Test errand',
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
      })

      try {
        // Simulate supplier deactivation
        await repo.supplierUpdateDeleteErrands([errandId])

        // Verify errand is now DELETED
        const errand = await prisma.errand.findUnique({ where: { id: errandId } })
        expect(errand?.status).toBe(ErrandStatus.Deleted)
      } finally {
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })

    it('should throw ERRAND NOT FOUND when trying to delete non-existent errands', async () => {
      // Generate valid UUIDs that don't exist using addPendingErrand
      const id1 = await repo.addPendingErrand('requester')
      const id2 = await repo.addPendingErrand('requester')

      // Delete them so they don't exist anymore
      await prisma.errand.deleteMany({ where: { id: { in: [id1, id2] } } })
      await prisma.pendingErrand.deleteMany({ where: { id: { in: [id1, id2] } } })

      // Try to delete errands that don't exist
      await expect(repo.supplierUpdateDeleteErrands([id1, id2])).rejects.toThrow('ERRAND NOT FOUND')
    })
  })
})
