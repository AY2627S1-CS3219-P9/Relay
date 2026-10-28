import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ErrandRepository, MAX_ERRANDS_PER_COURIER } from '../src/repositories/errand.repository.js'
import { ErrandStatus } from '@relay/contracts'
import { PrismaClient } from '@relay/errand-prisma'

const prisma = new PrismaClient()

describe('errand accept - concurrency tests', () => {
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

  async function createOpenErrands(count: number, requesterSub: string): Promise<string[]> {
    const ids: string[] = []
    for (let i = 0; i < count; i++) {
      const id = await repo.addPendingErrand(requesterSub)
      ids.push(id)
    }
    return ids
  }

  async function createErrand(errandId: string, requesterSub: string): Promise<void> {
    await prisma.pendingErrand.delete({ where: { id: errandId } })
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
        status: ErrandStatus.Open,
      },
    })
  }

  describe('same courier accepts errands concurrently', () => {
    it('should accept up to MAX_ERRANDS_PER_COURIER errands with 100 concurrent requests', async () => {
      const courierSub = `courier-${Date.now()}-${Math.random()}`
      const requesterSub = `requester-${Date.now()}-${Math.random()}`

      // Create MAX_ERRANDS_PER_COURIER + 5 errands (10 total with limit of 5)
      const errandIds = await createOpenErrands(MAX_ERRANDS_PER_COURIER + 5, requesterSub)

      // Create the errands in the database concurrently
      await Promise.all(errandIds.map((id) => createErrand(id, requesterSub)))

      // Try to accept all errands concurrently using Promise.all
      const results = await Promise.allSettled(errandIds.map((id) => repo.accept(id, courierSub)))

      const successes = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
      )
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')

      // Exactly MAX_ERRANDS_PER_COURIER should succeed
      expect(successes).toHaveLength(MAX_ERRANDS_PER_COURIER)
      expect(failures).toHaveLength(5)

      // All failures should be due to "MAX ERRANDS REACHED" error
      for (const failure of failures) {
        expect(failure.reason.message).toContain('MAX ERRANDS REACHED')
      }

      // Verify the courier has exactly MAX_ERRANDS_PER_COURIER errands
      const count = await prisma.errand.count({
        where: {
          courierSub,
          status: { in: [ErrandStatus.Accepted, ErrandStatus.PickedUp, ErrandStatus.Delivered] },
        },
      })
      expect(count).toBe(MAX_ERRANDS_PER_COURIER)
    }, 30000)

    it('should accept up to MAX_ERRANDS_PER_COURIER errands with 1000 concurrent requests', async () => {
      const courierSub = `courier-${Date.now()}-${Math.random()}`
      const requesterSub = `requester-${Date.now()}-${Math.random()}`

      // Create MAX_ERRANDS_PER_COURIER + 50 errands (60 total with limit of 5)
      const errandIds = await createOpenErrands(MAX_ERRANDS_PER_COURIER + 50, requesterSub)

      // Create the errands in the database concurrently
      await Promise.all(errandIds.map((id) => createErrand(id, requesterSub)))

      // Try to accept all errands concurrently using Promise.all
      const results = await Promise.allSettled(errandIds.map((id) => repo.accept(id, courierSub)))

      const successes = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
      )
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')

      // Exactly MAX_ERRANDS_PER_COURIER should succeed
      expect(successes).toHaveLength(MAX_ERRANDS_PER_COURIER)
      expect(failures).toHaveLength(50)

      // All failures should be due to "MAX ERRANDS REACHED" error
      for (const failure of failures) {
        expect(failure.reason.message).toContain('MAX ERRANDS REACHED')
      }

      // Verify the courier has exactly MAX_ERRANDS_PER_COURIER errands
      const count = await prisma.errand.count({
        where: {
          courierSub,
          status: { in: [ErrandStatus.Accepted, ErrandStatus.PickedUp, ErrandStatus.Delivered] },
        },
      })
      expect(count).toBe(MAX_ERRANDS_PER_COURIER)
    }, 30000)
  })

  describe('same courier accepts errands sequentially', () => {
    it('should accept up to MAX_ERRANDS_PER_COURIER errands', async () => {
      const courierSub = `courier-${Date.now()}-${Math.random()}`
      const requesterSub = `requester-${Date.now()}-${Math.random()}`

      // Create errands one by one and accept them sequentially
      for (let i = 0; i < MAX_ERRANDS_PER_COURIER; i++) {
        const errandId = await createOpenErrands(1, requesterSub)
        await createErrand(errandId[0], requesterSub)
        const result = await repo.accept(errandId[0], courierSub)
        expect(result.courierSub).toBe(courierSub)
        expect(result.status).toBe(ErrandStatus.Accepted)
      }

      // Verify the courier has exactly MAX_ERRANDS_PER_COURIER errands
      const count = await prisma.errand.count({
        where: {
          courierSub,
          status: { in: [ErrandStatus.Accepted, ErrandStatus.PickedUp, ErrandStatus.Delivered] },
        },
      })
      expect(count).toBe(MAX_ERRANDS_PER_COURIER)
    })

    it('should reject a 6th errand when courier already has MAX_ERRANDS_PER_COURIER', async () => {
      const courierSub = `courier-${Date.now()}-${Math.random()}`
      const requesterSub = `requester-${Date.now()}-${Math.random()}`

      // Create and accept MAX_ERRANDS_PER_COURIER errands
      for (let i = 0; i < MAX_ERRANDS_PER_COURIER; i++) {
        const errandId = await createOpenErrands(1, requesterSub)
        await createErrand(errandId[0], requesterSub)
        await repo.accept(errandId[0], courierSub)
      }

      // Try to accept a 6th errand - should fail
      const errandId = await createOpenErrands(1, requesterSub)
      await createErrand(errandId[0], requesterSub)

      await expect(repo.accept(errandId[0], courierSub)).rejects.toThrow('MAX ERRANDS REACHED')

      // Verify the courier still has exactly MAX_ERRANDS_PER_COURIER errands
      const count = await prisma.errand.count({
        where: {
          courierSub,
          status: { in: [ErrandStatus.Accepted, ErrandStatus.PickedUp, ErrandStatus.Delivered] },
        },
      })
      expect(count).toBe(MAX_ERRANDS_PER_COURIER)
    })
  })
})
