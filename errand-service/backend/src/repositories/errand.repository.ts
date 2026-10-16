import { Prisma, PrismaClient, type Errand as PrismaErrand } from '@relay/errand-prisma'
import type {
  CreateErrandRequest,
  Errand,
  ErrandLocation,
  ErrandStatus,
  OperatingHours,
  ServiceType,
  SupplierErrandSummary,
  SupplierErrandViewRequest,
} from '@relay/contracts'

export class ErrandRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  async create(requesterSub: string, request: CreateErrandRequest): Promise<Errand> {
    const row = await this.prisma.errand.create({
      data: {
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
    return toContract(row)
  }

  async listVisibleTo(userSub: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { OR: [{ requesterSub: userSub }, { courierSub: userSub }] },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toContract)
  }

  async listOwnedBy(requesterSub: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { requesterSub },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async expireOpenErrands(now = new Date()): Promise<number> {
    const result = await this.prisma.errand.updateMany({
      where: { status: 'OPEN', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    })
    return result.count
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
            ...(request.supplierId ? { supplierId: request.supplierId } : {}),
          }

    const rows = await this.prisma.errand.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toSupplierSummary)
  }

  async findVisibleById(errandId: string, userSub: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id: errandId, OR: [{ requesterSub: userSub }, { courierSub: userSub }] },
    })
    return row ? toContract(row) : null
  }

  async deleteOpenOwnedBy(errandId: string, requesterSub: string): Promise<boolean> {
    const result = await this.prisma.errand.deleteMany({
      where: { id: errandId, requesterSub, status: 'OPEN' },
    })
    return result.count === 1
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: 'OPEN', courierSub: null },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async listBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async findOpenById(errandId: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id: errandId, status: 'OPEN', courierSub: null },
    })
    return row ? toContract(row) : null
  }

  async findAcceptedById(errandId: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id: errandId, status: 'ACCEPTED' },
    })
    return row ? toContract(row) : null
  }

  async assignCourier(errandId: string, courierSub: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: { courierSub, status: 'ACCEPTED' },
    })
    return toContract(row)
  }

  async cancel(errandId: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: { status: 'CANCELLED' },
    })
    return toContract(row)
  }

  async findErrandsBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({ where: { supplierId } })
    return rows.map(toContract)
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

  async pickUp(errandId: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: { status: 'PICKED_UP' },
    })
    return toContract(row)
  }

  async deliver(errandId: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: { status: 'DELIVERED' },
    })
    return toContract(row)
  }

  async confirm(errandId: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: { status: 'CONFIRMED' },
    })
    return toContract(row)
  }

  async dropCourier(errandId: string, newStatus: ErrandStatus): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id: errandId },
      data: {
        courierSub: null,
        status: newStatus,
      },
    })
    return toContract(row)
  }

  async deleteErrand(errandId: string): Promise<void> {
    await this.prisma.errand.delete({
      where: { id: errandId },
    })
  }

  async findExpired(): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { status: 'OPEN', expiresAt: { lte: new Date() } },
    })
    return rows.map(toContract)
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toSupplierSummary(row: PrismaErrand): SupplierErrandSummary {
  const errand = toContract(row)
  return errand
}
