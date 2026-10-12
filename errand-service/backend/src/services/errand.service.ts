import {
  ErrandErrors,
  type CreateErrandRequest,
  type Errand,
  type ErrandLocation,
  type OperatingHours,
  type ServiceType,
} from '@relay/contracts'
import { ErrandRepository } from '../repositories/errand.repository.js'
import { ErrandServiceError, type AuthenticatedUser } from '../types/errand.types.js'
import { validateCreateErrand } from '../validators/errand.validator.js'

export class ErrandService {
  constructor(private readonly repository: ErrandRepository) {}

  async createErrand(user: AuthenticatedUser, input: unknown): Promise<Errand> {
    const request: CreateErrandRequest = validateCreateErrand(input)

    if (!user.emailVerified) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'A verified email is required to create an errand.',
        403,
      )
    }

    return this.repository.create(user.sub, request)
  }

  async getErrands(user: AuthenticatedUser): Promise<Errand[]> {
    return this.repository.listVisibleTo(user.sub)
  }

  async getErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }
    return errand
  }

  async deleteErrand(user: AuthenticatedUser, id: string): Promise<void> {
    const deleted = await this.repository.deleteOpenOwnedBy(id, user.sub)
    if (!deleted) {
      const existing = await this.repository.findVisibleById(id, user.sub)
      if (!existing) {
        throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
      }

      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Only open errands owned by the requester can be deleted.',
        409,
      )
    }
  }

  async receiveSupplierEvents(event: {
    supplierId: string
    name?: string
    location?: ErrandLocation
    operatingHours?: OperatingHours
    isOperational?: boolean
    serviceTypes?: ServiceType[]
  }): Promise<{ processed: boolean; affectedErrandIds: string[] }> {
    if (!event.supplierId) {
      return {
        processed: false,
        affectedErrandIds: [],
      }
    }

    const allErrands = await this.repository.findErrandsBySupplier(event.supplierId)
    const affectedErrands = allErrands.filter((e) => e.status === 'OPEN' || e.status === 'ACCEPTED')

    const affectedIds = affectedErrands.map((e) => e.id)

    if (affectedIds.length === 0) {
      return { processed: true, affectedErrandIds: [] }
    }

    await this.repository.updateErrandsBySupplier(event.supplierId, {
      name: event.name,
      location: event.location,
      operatingHours: event.operatingHours,
      isOperational: event.isOperational,
      serviceTypes: event.serviceTypes,
    })

    return { processed: true, affectedErrandIds: affectedIds }
  }
}
