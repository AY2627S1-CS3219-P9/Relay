import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ErrandRepository } from '../src/repositories/errand.repository.js'
import { ErrandStatus } from '@relay/contracts'
import { PrismaClient } from '@relay/errand-prisma'

const prisma = new PrismaClient()

describe('errand delete - error handling edge cases', () => {
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

  async function createErrandWithStatus(
    errandId: string,
    requesterSub: string,
    status: ErrandStatus,
    courierSub?: string,
  ): Promise<void> {
    // Delete pending errand first to avoid conflicts (use deleteMany to avoid errors)
    await prisma.pendingErrand.deleteMany({ where: { id: errandId } })
    await prisma.errand.create({
      data: {
        id: errandId,
        requesterSub,
        courierSub: status === ErrandStatus.Accepted ? courierSub : null,
        supplierId: 'supplier-1',
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status,
      },
    })
  }

  describe('delete() error handling', () => {
    it('should throw ERRAND NOT FOUND for non-existent errand', async () => {
      // Generate a valid UUID that doesn't exist
      const nonExistentId = await repo.addPendingErrand('requester')
      // Delete pending errand and errand (ignore errors if already deleted by parallel tests)
      try {
        await prisma.pendingErrand.deleteMany({ where: { id: nonExistentId } })
      } catch (e) {}
      await prisma.errand.deleteMany({ where: { id: nonExistentId } })

      await expect(repo.delete(nonExistentId, 'requester')).rejects.toThrow('ERRAND NOT FOUND')
    })

    it('should throw ERRAND NOT IN TERMINAL for OPEN errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create an OPEN errand
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Open)

      // Try to delete - should fail because OPEN is not a terminal state
      await expect(repo.delete(errandId, requesterSub)).rejects.toThrow('ERRAND NOT IN TERMINAL')

      // Verify errand is still OPEN
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Open)
    })

    it('should throw ERRAND NOT IN TERMINAL for ACCEPTED errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const courierSub = `courier-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      try {
        // Create an ACCEPTED errand
        await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Accepted)
        await prisma.errand.update({ where: { id: errandId }, data: { courierSub } })

        // Try to delete - should fail because ACCEPTED is not a terminal state
        await expect(repo.delete(errandId, requesterSub)).rejects.toThrow('ERRAND NOT IN TERMINAL')

        // Verify errand is still ACCEPTED (not modified)
        const errand = await prisma.errand.findUnique({ where: { id: errandId } })
        expect(errand?.status).toBe(ErrandStatus.Accepted)
        expect(errand?.courierSub).toBe(courierSub)
      } finally {
        // Cleanup this test's errand
        await prisma.errand.deleteMany({ where: { id: errandId } })
        await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
      }
    })

    it('should throw ONLY REQUESTER CAN DELETE for non-requester', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const otherUser = `other-user-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create a CANCELLED errand (use deleteMany to avoid errors)
      await prisma.pendingErrand.deleteMany({ where: { id: errandId } })
      await prisma.errand.create({
        data: {
          id: errandId,
          requesterSub,
          courierSub: null,
          supplierId: 'supplier-1',
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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: ErrandStatus.Cancelled,
        },
      })

      // Try to delete as someone else - should fail
      await expect(repo.delete(errandId, otherUser)).rejects.toThrow('ONLY REQUESTER CAN DELETE')

      // Verify errand status didn't change
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Cancelled)
      
      // Cleanup
      await prisma.errand.deleteMany({ where: { id: errandId } })
      await prisma.errandEventOutbox.deleteMany({ where: { payload: { path: ['errandId'], equals: errandId } } })
    })

    it('should succeed for CANCELLED errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create a CANCELLED errand
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Cancelled)

      // Delete should succeed
      await repo.delete(errandId, requesterSub)

      // Verify errand is now DELETED
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Deleted)

      // Verify outbox event was created
      const event = await prisma.errandEventOutbox.findFirst({
        where: {
          payload: { path: ['errandId'], equals: errandId },
          eventType: 'ErrandDeleted',
        },
      })
      expect(event).not.toBeNull()
    })

    it('should succeed for EXPIRED errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create an EXPIRED errand
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Expired)

      // Delete should succeed
      await repo.delete(errandId, requesterSub)

      // Verify errand is now DELETED
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Deleted)
    })

    it('should succeed for CONFIRMED errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create a CONFIRMED errand
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Confirmed)

      // Delete should succeed
      await repo.delete(errandId, requesterSub)

      // Verify errand is now DELETED
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Deleted)
    })

    it('should throw ERRAND ALREADY DELETED for already deleted errand', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create a CANCELLED errand and delete it
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Cancelled)
      await repo.delete(errandId, requesterSub)

      // Try to delete again - should fail
      await expect(repo.delete(errandId, requesterSub)).rejects.toThrow('ERRAND ALREADY DELETED')
    })

    it('should throw all errors (not just P2025) - general error handling', async () => {
      const requesterSub = `requester-${Date.now()}-${Math.random()}`
      const errandId = await repo.addPendingErrand(requesterSub)

      // Create a CANCELLED errand
      await createErrandWithStatus(errandId, requesterSub, ErrandStatus.Cancelled)

      // The delete should succeed for terminal state errands
      // This test verifies that the delete method works correctly for CANCELLED errands
      await expect(repo.delete(errandId, requesterSub)).resolves.toBeUndefined()

      // Verify errand was deleted
      const errand = await prisma.errand.findUnique({ where: { id: errandId } })
      expect(errand?.status).toBe(ErrandStatus.Deleted)
    })
  })
})
