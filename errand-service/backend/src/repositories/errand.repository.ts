import { PrismaClient, type Errand as PrismaErrand } from '@prisma/client'
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
        pickupLat: request.pickupLocation.lat,
        pickupLng: request.pickupLocation.lng,
        pickupBuildingName: request.pickupLocation.buildingName,
        pickupFloorNumber: request.pickupLocation.floorNumber,
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

  async findVisibleById(id: string, userSub: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id, OR: [{ requesterSub: userSub }, { courierSub: userSub }] },
    })
    return row ? toContract(row) : null
  }

  async deleteOpenOwnedBy(id: string, requesterSub: string): Promise<boolean> {
    const result = await this.prisma.errand.deleteMany({
      where: { id, requesterSub, status: 'OPEN' },
    })
    return result.count === 1
  }

  // Internal method for supplier service integration
  // This method is used to find the current errands associated with a supplier,
  //  so that they can be updated when the supplier's information changes.
  async findErrandsBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({ where: { supplierId } })
    return rows.map(toContract)
  }

  // Internal method for supplier service integration
  // This method is used to update the errands associated with a supplier
  // when the supplier's information changes.
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
      rows.map(async (row: PrismaErrand) => {
        const changes: any = { updatedAt: new Date() }

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
}

function defaultExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

function toContract(row: PrismaErrand): Errand {
  return {
    id: row.id,
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
  }
}
