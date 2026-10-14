import { PrismaClient } from '@prisma/client'
import type {
  CreateErrandRequest,
  Errand,
  ErrandLocation,
  ErrandStatus,
  OperatingHours,
  ServiceType,
} from '@relay/contracts'

export class ErrandRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  async create(requesterSub: string, request: CreateErrandRequest): Promise<Errand> {
    const row = await this.prisma.errand.create({
      data: {
        requesterSub,
        supplierId: request.supplierId,
        name: request.name,
        pickupLat: request.pickupLocation.lat,
        pickupLng: request.pickupLocation.lng,
        pickupBuildingName: request.pickupLocation.buildingName,
        pickupFloorNumber: request.pickupLocation.floorNumber,
        supplierName: request.supplierName,
        serviceType: request.serviceType,
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
    supplierId: row.supplierId,
    pickupLocation: {
      lat: row.pickupLat,
      lng: row.pickupLng,
      buildingName: row.pickupBuildingName,
      floorNumber: row.pickupFloorNumber,
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
    supplierName: row.supplierName,
    serviceType: row.serviceType,
  }
}
