import { 
  Prisma,
  PrismaClient,
  type Errand as PrismaErrand 
} from '../../../../node_modules/.prisma/errand-client/index.js'
import type { 
  SupplierErrandSummary,
  SupplierErrandViewRequest,
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
            supplierId: request.supplierId ? request.supplierId : { not: null },
            expiresAt: { gt: new Date() },
          }
        : {
            requesterSub: request.viewerSub,
            supplierId: request.supplierId ? request.supplierId : { not: null },
          }

    const rows = await this.prisma.errand.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toSupplierSummary)
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

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({
      where: { supplierId, status: 'OPEN', courierSub: null },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toContract)
  }

  async findOpenById(id: string): Promise<Errand | null> {
    const row = await this.prisma.errand.findFirst({
      where: { id, status: 'OPEN', courierSub: null },
    })
    return row ? toContract(row) : null
  }

  async assignCourier(id: string, courierSub: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id },
      data: { courierSub, status: 'ACCEPTED' },
    })
    return toContract(row)
  }

  async cancel(id: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    return toContract(row)
  }

  // Internal method for supplier service integration.
  // Finds errands by supplier ID for notification purposes.
  async findErrandsBySupplier(supplierId: string): Promise<Errand[]> {
    const rows = await this.prisma.errand.findMany({ where: { supplierId } })
    return rows.map(toContract)
  }

  // Internal method for supplier service integration.
  // Updates errands when supplier information changes.
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

  async pickUp(id: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id },
      data: { status: 'PICKED_UP' },
    })
    return toContract(row)
  }

  async deliver(id: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id },
      data: { status: 'DELIVERED' },
    })
    return toContract(row)
  }

  async confirm(id: string): Promise<Errand> {
    const row = await this.prisma.errand.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    })
    return toContract(row)
  }
}

function defaultExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

function toContract(row: any): Errand {
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

function toSupplierSummary(row: PrismaErrand): SupplierErrandSummary {
  const errand = toContract(row)
  if (!errand.supplierId) throw new Error('Supplier errand summary requires a supplier.')
  const { requesterSub: _requesterSub, courierSub: _courierSub, ...summary } = errand
  return { ...summary, supplierId: errand.supplierId }
}
