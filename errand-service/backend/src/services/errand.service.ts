import { 
  ErrandErrors, 
  type CreateErrandRequest, 
  type Errand,
  type GetErrandsOptions,
  type ErrandLocation,
  type OperatingHours,
  type ServiceType,
  type SupplierErrandSummary,
  type SupplierErrandViewRequest,
} from '@relay/contracts'
import { ErrandRepository } from '../repositories/errand.repository.js'
import { SupplierClient } from '../clients/supplier.client.js'
import { 
  ErrandServiceError, 
  type AuthenticatedUser 
} from '../types/errand.types.js'
import { validateCreateErrand } from '../validators/errand.validator.js'

export class ErrandService {
  constructor(
    private readonly repository: ErrandRepository,
    private readonly supplierClient: SupplierClient = new SupplierClient(),
  ) {}

  async createErrand(user: AuthenticatedUser, input: unknown): Promise<Errand> {
    const request: CreateErrandRequest = validateCreateErrand(input)

    if (!user.emailVerified) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'A verified email is required to create an errand.',
        403,
      )
    }

    await this.supplierClient.validateSelection({ supplierId: request.supplierId })

    return this.repository.create(user.sub, request)
  }

  async getErrands(user: AuthenticatedUser, options: GetErrandsOptions = {}): Promise<Errand[]> {
    await this.repository.expireOpenErrands()
    return options.scope === 'mine'
      ? this.repository.listOwnedBy(user.sub)
      : this.repository.listVisibleTo(user.sub)
  }

  async getSupplierErrandView(
    user: AuthenticatedUser,
    request: SupplierErrandViewRequest,
  ): Promise<SupplierErrandSummary[]> {
    await this.repository.expireOpenErrands()
    return this.repository.listSupplierView({ ...request, viewerSub: user.sub })
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    await this.repository.expireOpenErrands()
    return this.repository.listOpenBySupplier(supplierId)
  }

  async getErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.expireOpenErrands()
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }
    return errand
  }

  async acceptErrand(courier: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.expireOpenErrands()
    const errand = await this.repository.findOpenById(id)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    if (errand.courierSub !== null) {
      throw new ErrandServiceError(
        ErrandErrors.CONFLICT,
        'Errand has already been accepted by another courier.',
        409,
      )
    }

    if (errand.requesterSub === courier.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'Requesters cannot accept their own errands.',
        403,
      )
    }

    return this.repository.assignCourier(id, courier.sub)
  }

  async cancelErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    if (errand.courierSub !== user.sub && errand.requesterSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'You do not have permission to cancel this errand.',
        403,
      )
    }

    if (errand.status !== 'ACCEPTED') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Only accepted errands can be cancelled.',
        409,
      )
    }

    return this.repository.cancel(id)
  }

  async deliverErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    if (errand.courierSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'Only the assigned courier can deliver this errand.',
        403,
      )
    }

    if (errand.status !== 'PICKED_UP') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Errand must be picked up before it can be delivered.',
        409,
      )
    }

    return this.repository.deliver(id)
  }

  async confirmErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    // Only the requester can confirm
    if (errand.requesterSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'Only the requester can confirm this errand.',
        403,
      )
    }

    if (errand.status !== 'DELIVERED') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Errand must be delivered before it can be confirmed.',
        409,
      )
    }

    // Send placeholder credit transfer request to credit service
    // TODO: Implement actual credit transfer API call to credit-service
    // await fetch(`${CREDIT_SERVICE_URL}/internal/credit/transfer`, { ... })

    return this.repository.confirm(id)
  }

  async pickUpErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    if (errand.courierSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'Only the assigned courier can pick up this errand.',
        403,
      )
    }

    if (errand.status !== 'ACCEPTED') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Errand must be accepted before it can be picked up.',
        409,
      )
    }

    return this.repository.pickUp(id)
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
        'Only eligible errands owned by the requester can be deleted.',
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
