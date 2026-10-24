import { Prisma, PrismaClient, type Errand as PrismaErrand } from '@relay/errand-prisma'
import { ErrandEventTypes } from '@relay/contracts'
import type {
  CreateErrandRequest,
  Errand,
  ErrandLocation,
  ErrandStatus,
  ErrandEventPayload,
  ErrandEventType,
  OperatingHours,
  ServiceType,
  SupplierErrandSummary,
  SupplierErrandViewRequest,
} from '@relay/contracts'
import { ErrandEventStream } from '../services/errandEventStream.js'

export const MAX_ERRANDS_PER_COURIER = 5
import { endOfSingaporeDay } from '../utils/deadline.js'

async function appendEvent(
  tx: Prisma.TransactionClient,
  event: { eventType: ErrandEventType; payload: ErrandEventPayload },
): Promise<void> {
  await tx.errandEventOutbox.create({
    data: {
      id: crypto.randomUUID(),
      eventType: event.eventType,
      payload: event.payload as unknown as Prisma.InputJsonValue,
    },
  })
}

export class ErrandRepository {
  constructor(
    private readonly prisma: PrismaClient = new PrismaClient(),
    private readonly eventStream?: ErrandEventStream,
  ) {}

  // ============================================================================
  // Outbox/Event methods
  // ============================================================================

  async addPendingErrand(requesterSub: string): Promise<string> {
    const id = crypto.randomUUID()
    await this.prisma.pendingErrand.create({ data: { id, requesterSub } })
    return id
  }

  async deletePendingErrand(id: string): Promise<void> {
    const removed = await this.prisma.pendingErrand.deleteMany({
      where: { id },
    })
    if (removed.count === 0) {
    }
  }

  async publishCreationFailedEvent(id: string, requesterSub: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_CREATION_FAILED,
        payload: { errandId: id, requesterSub },
      })
    })
  }

  async createErrand(
    id: string,
    requesterSub: string,
    request: CreateErrandRequest,
  ): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.pendingErrand.findUnique({ where: { id } })
      if (!pending || pending.requesterSub !== requesterSub) {
        throw new Error('Pending errand was already recovered.')
      }
      const row = await tx.errand.create({
        data: {
          id,
          requesterSub,
          supplierId: request.supplierDetails.supplierId,
          name: request.name,
          pickupLat: request.pickupLocation.lat,
          pickupLng: request.pickupLocation.lng,
          pickupBuildingName: request.pickupLocation.buildingName,
          pickupFloorNumber: request.pickupLocation.floorNumber,
          targetLat: request.targetLocation.lat,
          targetLng: request.targetLocation.lng,
          targetBuildingName: request.targetLocation.buildingName,
          targetFloorNumber: request.targetLocation.floorNumber,
          supplierName: request.supplierDetails.supplierName,
          serviceType: request.supplierDetails.serviceType,
          deliveryDescription: request.deliveryDetails.description,
          deliveryInstructions: request.deliveryDetails.instructions,
          creditAmount: request.creditAmount,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : defaultExpiry(),
        },
      })
      await tx.pendingErrand.delete({ where: { id } })
      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_CREATED,
        payload: {
          errandId: id,
          requesterSub,
          supplierId: row.supplierId,
          creditAmount: row.creditAmount,
          expiresAt: row.expiresAt.toISOString(),
        },
      })
      return toContract(row)
    })
  }

  async recoverExpiredPending(cutoff = new Date(Date.now() - 30_000)): Promise<number> {
    const rows = await this.prisma.pendingErrand.findMany({
      where: { createdAt: { lt: cutoff } },
      take: 100,
      orderBy: { createdAt: 'asc' },
    })
    let count = 0
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const removed = await tx.pendingErrand.deleteMany({
          where: { id: row.id, createdAt: { lt: cutoff } },
        })
        if (!removed.count) return
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_CREATION_FAILED,
          payload: { errandId: row.id, requesterSub: row.requesterSub },
        })
        count++
      })
    }
    return count
  }

  async unpublishedEvents() {
    return this.prisma.errandEventOutbox.findMany({
      where: { publishedAt: null },
      take: 100,
      orderBy: { createdAt: 'asc' },
    })
  }

  async markEventPublished(id: string): Promise<void> {
    await this.prisma.errandEventOutbox.updateMany({
      where: { id, publishedAt: null },
      data: { publishedAt: new Date() },
    })
  }

  async deleteOldPublishedEvents(cutoff: Date): Promise<number> {
    const result = await this.prisma.errandEventOutbox.deleteMany({
      where: { publishedAt: { lt: cutoff } },
    })
    return result.count
  }

  // ============================================================================
  // Find methods
  // ============================================================================

  async findOpenById(errandId: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: {
        id: errandId,
        status: 'OPEN',
      },
    })
    return row ? toContract(row) : null
  }

  async findVisibleById(errandId: string, userSub: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: {
        id: errandId,
        OR: [{ requesterSub: userSub }, { courierSub: userSub }],
        status: { not: 'DELETED' },
      },
    })
    return row ? toContract(row) : null
  }

  async findAcceptedById(errandId: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id: errandId, status: 'ACCEPTED' },
    })
    return row ? toContract(row) : null
  }

  async findErrandsBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({ where: { supplierId } })
    return rows.map(toContract)
  }

  async findExpired(): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { status: 'OPEN', expiresAt: { lte: new Date() } },
    })
    return rows.map(toContract)
  }

  // ============================================================================
  // List methods
  // ============================================================================

  async listOwnedBy(requesterSub: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: {
        requesterSub,
        status: { not: 'DELETED' },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return rows.map(toContract)
  }

  async listVisibleTo(userSub: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: {
        OR: [{ requesterSub: userSub }, { courierSub: userSub }],
        status: { not: 'DELETED' },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toContract)
  }

  async listBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: 'OPEN', courierSub: null },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async listSupplierView(
    request: SupplierErrandViewRequest & { viewerSub: string },
  ): Promise<SupplierErrandSummary[]> {
    const where: Prisma.ErrandWhereInput =
      request.scope === 'explore'
        ? {
            status: 'OPEN',
            requesterSub: { not: request.viewerSub },
            ...(request.supplierId ? { supplierId: request.supplierId } : {}),
            expiresAt: { gt: new Date() },
          }
        : {
            requesterSub: request.viewerSub,
            status: { not: 'DELETED' },
            ...(request.supplierId ? { supplierId: request.supplierId } : {}),
          }

    const rows = await this.prisma.errand.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toSupplierSummary)
  }

  // ============================================================================
  // State transitions
  // ============================================================================

  async assignCourierAndIncrementCount(errandId: string, courierSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const currentCount = await tx.errand.count({
        where: {
          courierSub,
          status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERED'] },
        },
      })

      if (currentCount >= MAX_ERRANDS_PER_COURIER) {
        throw new Error('MAX ERRANDS REACHED')
      }

      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: 'OPEN',
          courierSub: null,
        },
        data: {
          courierSub,
          status: 'ACCEPTED',
        },
      })

      if (updated.count === 0) {
        throw new Error('ERRAND NOT AVAILABLE')
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })

      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
        payload: {
          errandId,
          errandStatus: 'ACCEPTED',
          previousStatus: 'OPEN',
          actorSub: courierSub,
          actorType: 'courier',
          requesterSub: row.requesterSub,
        },
      })

      this.eventStream?.publish(
        errandId,
        {
          newStatus: 'ACCEPTED',
          previousStatus: 'OPEN',
          timestamp: new Date().toISOString(),
        },
        ['requester'],
      )

      return toContract(row)
    })
  }

  async cancel(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: { in: ['OPEN', 'ACCEPTED'] },
        },
        data: { status: 'CANCELLED' },
      })

      if (updated.count === 0) {
        throw new Error(
          'Errand is no longer cancellable - it may have already been cancelled or moved to another state.',
        )
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })

      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_CANCELLED,
        payload: { errandId, actorSub, requesterSub: row.requesterSub },
      })

      return toContract(row)
    })
  }

  async pickUp(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: 'ACCEPTED',
        },
        data: { status: 'PICKED_UP' },
      })

      if (updated.count === 0) {
        throw new Error(
          'Errand is no longer in ACCEPTED status - it may have already been picked up.',
        )
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })

      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
        payload: {
          errandId,
          errandStatus: 'PICKED_UP',
          previousStatus: 'ACCEPTED',
          actorSub,
          actorType: 'courier',
          requesterSub: row.requesterSub,
        },
      })

      this.eventStream?.publish(
        errandId,
        {
          newStatus: 'PICKED_UP',
          previousStatus: 'ACCEPTED',
          timestamp: new Date().toISOString(),
        },
        ['requester'],
      )

      return toContract(row)
    })
  }

  async deliver(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const deliveredAt = new Date()
      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: 'PICKED_UP',
        },
        data: {
          status: 'DELIVERED',
          confirmationDeadline: endOfSingaporeDay(deliveredAt),
        },
      })

      if (updated.count === 0) {
        throw new Error(
          'Errand is no longer in PICKED_UP status - it may have already been delivered.',
        )
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })

      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
        payload: {
          errandId,
          errandStatus: 'DELIVERED',
          previousStatus: 'PICKED_UP',
          actorSub,
          actorType: 'courier',
          requesterSub: row.requesterSub,
        },
      })

      this.eventStream?.publish(
        errandId,
        {
          newStatus: 'DELIVERED',
          previousStatus: 'PICKED_UP',
          timestamp: new Date().toISOString(),
        },
        ['requester'],
      )

      return toContract(row)
    })
  }

  async confirm(errandId: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: 'DELIVERED',
        },
        data: { status: 'CONFIRMED' },
      })

      if (updated.count === 0) {
        throw new Error(
          'Errand is no longer in DELIVERED status - it may have already been confirmed.',
        )
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })
      if (!row.courierSub) throw new Error('A courier is required to confirm an errand.')

      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_COMPLETED,
        payload: { errandId, requesterSub: row.requesterSub, courierSub: row.courierSub },
      })

      this.eventStream?.publish(
        errandId,
        {
          newStatus: 'CONFIRMED',
          previousStatus: 'DELIVERED',
          timestamp: new Date().toISOString(),
        },
        ['requester', 'courier'],
      )

      return toContract(row)
    })
  }

  async dropCourier(errandId: string, newStatus: ErrandStatus, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.errand.updateMany({
        where: {
          id: errandId,
          status: 'ACCEPTED',
        },
        data: { courierSub: null, status: newStatus },
      })

      if (updated.count === 0) {
        throw new Error(
          'Errand is no longer in ACCEPTED status - it may have already been dropped or moved to another state.',
        )
      }

      const row = await tx.errand.findUniqueOrThrow({ where: { id: errandId } })
      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
        payload: {
          errandId,
          errandStatus: newStatus,
          previousStatus: 'ACCEPTED',
          actorSub,
          actorType: 'courier',
          requesterSub: row.requesterSub,
        },
      })

      if (newStatus === 'EXPIRED') {
        await appendEvent(tx, { eventType: ErrandEventTypes.ERRAND_EXPIRED, payload: { errandId } })
      }

      this.eventStream?.publish(
        errandId,
        {
          newStatus: newStatus,
          previousStatus: 'ACCEPTED',
          timestamp: new Date().toISOString(),
        },
        ['requester'],
      )

      return toContract(row)
    })
  }

  async deleteErrand(errandId: string, requesterSub: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
          requesterSub,
          status: { in: ['CANCELLED', 'EXPIRED', 'CONFIRMED', 'DELETED'] },
        },
      })

      if (!errand) {
        throw new Error('Errand not found or not in a deletable state.')
      }

      await tx.errand.delete({ where: { id: errandId } })
      await appendEvent(tx, {
        eventType: ErrandEventTypes.ERRAND_DELETED,
        payload: { errandId, requesterSub },
      })
    })
  }

  async updateErrandsBySupplier(
    supplierId: string,
    updates: Partial<{
      name: string
      location: ErrandLocation
      operatingHours: OperatingHours
      isOperational: boolean
      serviceTypes: ServiceType[]
    }>,
  ): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({ where: { supplierId } })

    const updatedRows = await Promise.all(
      rows.map(async (row: any) => {
        const changes: any = { updatedAt: new Date() }

        if (updates.name !== undefined) {
          changes.supplierName = updates.name
        }

        if (updates.location) {
          changes.pickupLat = updates.location.lat
          changes.pickupLng = updates.location.lng
          if (updates.location.buildingName !== undefined) {
            changes.pickupBuildingName = updates.location.buildingName
          }
          if (updates.location.floorNumber !== undefined) {
            changes.pickupFloorNumber = updates.location.floorNumber
          }
        }

        return await this.prisma.errand.update({
          where: { id: row.id },
          data: changes,
        })
      }),
    )

    return updatedRows.map(toContract)
  }

  // ============================================================================
  // Lifecycle/Background tasks
  // ============================================================================

  async expireOpenErrands(now = new Date()): Promise<number> {
    const rows = await this.prisma.errand.findMany({
      where: { status: 'OPEN', expiresAt: { lte: now } },
      select: { id: true, requesterSub: true },
    })
    let count = 0
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.errand.updateMany({
          where: { id: row.id, status: 'OPEN', expiresAt: { lte: now } },
          data: { status: 'EXPIRED' },
        })
        if (!changed.count) return
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_EXPIRED,
          payload: { errandId: row.id },
        })

        this.eventStream?.publish(
          row.id,
          {
            newStatus: 'EXPIRED',
            previousStatus: 'OPEN',
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        count++
      })
    }
    return count
  }

  async confirmDeliveredErrands(now = new Date()): Promise<number> {
    const rows = await this.prisma.errand.findMany({
      where: {
        status: 'DELIVERED',
        confirmationDeadline: { lte: now },
        courierSub: { not: null },
      },
      select: { id: true },
    })
    let count = 0

    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.errand.updateMany({
          where: {
            id: row.id,
            status: 'DELIVERED',
            confirmationDeadline: { lte: now },
            courierSub: { not: null },
          },
          data: { status: 'CONFIRMED' },
        })
        if (!changed.count) return

        const confirmed = await tx.errand.findUniqueOrThrow({ where: { id: row.id } })
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId: confirmed.id,
            errandStatus: 'CONFIRMED',
            previousStatus: 'DELIVERED',
            actorType: 'system',
            requesterSub: confirmed.requesterSub,
            courierSub: confirmed.courierSub ?? undefined,
          },
        })
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_COMPLETED,
          payload: {
            errandId: confirmed.id,
            requesterSub: confirmed.requesterSub,
            courierSub: confirmed.courierSub ?? undefined,
          },
        })

        this.eventStream?.publish(
          confirmed.id,
          {
            newStatus: 'CONFIRMED',
            previousStatus: 'DELIVERED',
            timestamp: new Date().toISOString(),
          },
          ['requester', 'courier'],
        )
        count++
      })
    }

    return count
  }
}

function defaultExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

function toContract(row: any): Errand {
  return {
    id: row.id,
    name: row.name,
    requesterSub: row.requesterSub,
    courierSub: row.courierSub,
    courierProfile: null,
    supplierDetails: {
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      serviceType: row.serviceType,
    },
    pickupLocation: {
      lat: row.pickupLat,
      lng: row.pickupLng,
      buildingName: row.pickupBuildingName,
      floorNumber: row.pickupFloorNumber,
    },
    targetLocation: {
      lat: row.targetLat,
      lng: row.targetLng,
      buildingName: row.targetBuildingName,
      floorNumber: row.targetFloorNumber,
    },
    deliveryDetails: {
      description: row.deliveryDescription,
      ...(row.deliveryInstructions ? { instructions: row.deliveryInstructions } : {}),
    },
    creditAmount: row.creditAmount,
    status: row.status as ErrandStatus,
    expiresAt: row.expiresAt.toISOString(),
    confirmationDeadline: row.confirmationDeadline?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toSupplierSummary(row: PrismaErrand): SupplierErrandSummary {
  const errand = toContract(row)
  return errand
}
