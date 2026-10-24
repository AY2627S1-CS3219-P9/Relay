import { Prisma, PrismaClient, type Errand as PrismaErrand } from '@relay/errand-prisma'
import { ErrandEventTypes } from '@relay/contracts'
import {
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
    await this.prisma.pendingErrand.deleteMany({
      where: { id },
    })
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

  async findVisibleById(errandId: string, userSub: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: {
        id: errandId,
        OR: [{ requesterSub: userSub }, { courierSub: userSub }],
        status: { not: ErrandStatus.Deleted },
      },
    })
    return row ? toContract(row) : null
  }

  // ============================================================================
  // List methods
  // ============================================================================

  async listOwnedBy(requesterSub: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: {
        requesterSub,
        status: { not: ErrandStatus.Deleted },
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
        status: { not: ErrandStatus.Deleted },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toContract)
  }

  async listBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: { not: ErrandStatus.Deleted } },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: ErrandStatus.Open, courierSub: null },
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
            status: ErrandStatus.Open,
            requesterSub: { not: request.viewerSub },
            ...(request.supplierId ? { supplierId: request.supplierId } : {}),
            expiresAt: { gt: new Date() },
          }
        : {
            requesterSub: request.viewerSub,
            status: { not: ErrandStatus.Deleted },
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

  async accept(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status === ErrandStatus.Accepted) {
        throw new Error('ERRAND ALREADY ACCEPTED')
      }

      if (errand.status !== ErrandStatus.Open) {
        throw new Error('ERRAND NOT IN OPEN')
      }

      if (errand.requesterSub === actorSub) {
        throw new Error('REQUESTER CANNOT ACCEPT OWN ERRAND')
      }

      try {
        const currentCount = await tx.errand.count({
          where: {
            courierSub: actorSub,
            status: { in: [ErrandStatus.Accepted, ErrandStatus.PickedUp, ErrandStatus.Delivered] },
          },
        })

        if (currentCount >= MAX_ERRANDS_PER_COURIER) {
          throw new Error('MAX ERRANDS REACHED')
        }

        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.Open, courierSub: null },
          data: {
            courierSub: actorSub,
            status: ErrandStatus.Accepted,
          },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId,
            errandStatus: ErrandStatus.Accepted,
            previousStatus: ErrandStatus.Open,
            actorSub: actorSub,
            actorType: 'courier',
            requesterSub: updated.requesterSub,
          },
        })

        this.eventStream?.publish(
          errandId,
          {
            newStatus: ErrandStatus.Accepted,
            previousStatus: ErrandStatus.Open,
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN OPEN')
        }
        throw error
      }
    })
  }

  async cancel(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status === ErrandStatus.Cancelled) {
        throw new Error('ERRAND ALREADY CANCELLED')
      }

      if (errand.status !== ErrandStatus.Open) {
        throw new Error('ERRAND NOT IN OPEN')
      }

      if (errand.requesterSub !== actorSub) {
        throw new Error('ONLY REQUESTER CAN CANCEL')
      }

      try {
        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.Open },
          data: { status: ErrandStatus.Cancelled },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_CANCELLED,
          payload: { errandId, actorSub, requesterSub: updated.requesterSub },
        })

        this.eventStream?.publish(
          errandId,
          {
            newStatus: ErrandStatus.Cancelled,
            previousStatus: ErrandStatus.Open,
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN OPEN')
        }
        throw error
      }
    })
  }

  async pickUp(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status === ErrandStatus.PickedUp) {
        throw new Error('ERRAND ALREADY PICKED UP')
      }

      if (errand.status !== ErrandStatus.Accepted) {
        throw new Error('ERRAND NOT IN ACCEPTED')
      }

      if (errand.courierSub !== actorSub) {
        throw new Error('ONLY COURIER CAN PICK UP')
      }

      try {
        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.Accepted },
          data: { status: ErrandStatus.PickedUp },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId,
            errandStatus: ErrandStatus.PickedUp,
            previousStatus: ErrandStatus.Accepted,
            actorSub,
            actorType: 'courier',
            requesterSub: updated.requesterSub,
          },
        })

        this.eventStream?.publish(
          errandId,
          {
            newStatus: ErrandStatus.PickedUp,
            previousStatus: ErrandStatus.Accepted,
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN ACCEPTED')
        }
        throw error
      }
    })
  }

  async deliver(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status === ErrandStatus.Delivered) {
        throw new Error('ERRAND ALREADY DELIVERED')
      }

      if (errand.status !== ErrandStatus.PickedUp) {
        throw new Error('ERRAND NOT IN PICKED_UP')
      }

      if (errand.courierSub !== actorSub) {
        throw new Error('ONLY COURIER CAN DELIVER')
      }

      const deliveredAt = new Date()

      try {
        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.PickedUp },
          data: {
            status: ErrandStatus.Delivered,
            confirmationDeadline: endOfSingaporeDay(deliveredAt),
          },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId,
            errandStatus: ErrandStatus.Delivered,
            previousStatus: ErrandStatus.PickedUp,
            actorSub,
            actorType: 'courier',
            requesterSub: updated.requesterSub,
          },
        })

        this.eventStream?.publish(
          errandId,
          {
            newStatus: ErrandStatus.Delivered,
            previousStatus: ErrandStatus.PickedUp,
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN PICKED_UP')
        }
        throw error
      }
    })
  }

  async confirm(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT IN FOUND')
      }

      if (errand.status === ErrandStatus.Confirmed) {
        throw new Error('ERRAND ALREADY CONFIRMED')
      }

      if (errand.status !== ErrandStatus.Delivered) {
        throw new Error('ERRAND NOT IN DELIVERED')
      }

      if (errand.requesterSub !== actorSub) {
        throw new Error('ONLY REQUESTER CAN CONFIRM')
      }

      try {
        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.Delivered, courierSub: { not: null } },
          data: { status: ErrandStatus.Confirmed },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_COMPLETED,
          payload: {
            errandId,
            requesterSub: updated.requesterSub,
            courierSub: updated.courierSub!,
          },
        })

        this.eventStream?.publish(
          errandId,
          {
            newStatus: ErrandStatus.Confirmed,
            previousStatus: ErrandStatus.Delivered,
            timestamp: new Date().toISOString(),
          },
          ['requester', 'courier'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN DELIVERED')
        }
        throw error
      }
    })
  }

  async drop(errandId: string, actorSub: string): Promise<Errand> {
    return this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status !== ErrandStatus.Accepted) {
        throw new Error('ERRAND NOT IN ACCEPTED')
      }

      if (errand.courierSub !== actorSub) {
        throw new Error('ONLY COURIER CAN DROP')
      }

      // Determine status based on expiry
      const now = new Date()
      const isExpired = errand.expiresAt && new Date(errand.expiresAt) <= now
      const newStatus = isExpired ? ErrandStatus.Expired : ErrandStatus.Open

      try {
        const updated = await tx.errand.update({
          where: { id: errandId, status: ErrandStatus.Accepted, courierSub: actorSub },
          data: { courierSub: null, status: newStatus },
        })

        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId,
            errandStatus: newStatus,
            previousStatus: ErrandStatus.Accepted,
            actorSub,
            actorType: 'courier',
            requesterSub: updated.requesterSub,
          },
        })

        if (newStatus === ErrandStatus.Expired) {
          await appendEvent(tx, {
            eventType: ErrandEventTypes.ERRAND_EXPIRED,
            payload: { errandId },
          })
        }

        this.eventStream?.publish(
          errandId,
          {
            newStatus: newStatus,
            previousStatus: ErrandStatus.Accepted,
            timestamp: new Date().toISOString(),
          },
          ['requester'],
        )

        return toContract(updated)
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN ACCEPTED')
        }
        throw error
      }
    })
  }

  async delete(errandId: string, actorSub: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const errand = await tx.errand.findFirst({
        where: {
          id: errandId,
        },
      })

      if (!errand) {
        throw new Error('ERRAND NOT FOUND')
      }

      if (errand.status === ErrandStatus.Deleted) {
        throw new Error('ERRAND ALREADY DELETED')
      }

      if (
        errand.status !== ErrandStatus.Cancelled &&
        errand.status !== ErrandStatus.Expired &&
        errand.status !== ErrandStatus.Confirmed
      ) {
        throw new Error('ERRAND NOT IN TERMINAL')
      }

      if (errand.requesterSub !== actorSub) {
        throw new Error('ONLY REQUESTER CAN DELETE')
      }

      try {
        await tx.errand.update({
          where: {
            id: errandId,
            status: { in: [ErrandStatus.Cancelled, ErrandStatus.Expired, ErrandStatus.Confirmed] },
          },
          data: { status: ErrandStatus.Deleted },
        })
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_DELETED,
          payload: { errandId, requesterSub: actorSub },
        })
      } catch (error) {
        if (isUpdateUnsuccessful(error)) {
          throw new Error('ERRAND NOT IN TERMINAL')
        }
      }
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
      where: { status: ErrandStatus.Open, expiresAt: { lte: now } },
      select: { id: true, requesterSub: true },
    })
    let count = 0
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.errand.updateMany({
          where: { id: row.id, status: ErrandStatus.Open, expiresAt: { lte: now } },
          data: { status: ErrandStatus.Expired },
        })
        if (!changed.count) return
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_EXPIRED,
          payload: { errandId: row.id },
        })

        this.eventStream?.publish(
          row.id,
          {
            newStatus: ErrandStatus.Expired,
            previousStatus: ErrandStatus.Open,
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
        status: ErrandStatus.Delivered,
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
            status: ErrandStatus.Delivered,
            confirmationDeadline: { lte: now },
            courierSub: { not: null },
          },
          data: { status: ErrandStatus.Confirmed },
        })
        if (!changed.count) return

        const confirmed = await tx.errand.findUniqueOrThrow({ where: { id: row.id } })
        await appendEvent(tx, {
          eventType: ErrandEventTypes.ERRAND_STATUS_CHANGED,
          payload: {
            errandId: confirmed.id,
            errandStatus: ErrandStatus.Confirmed,
            previousStatus: ErrandStatus.Delivered,
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
            newStatus: ErrandStatus.Confirmed,
            previousStatus: ErrandStatus.Delivered,
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

function isUpdateUnsuccessful(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
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
