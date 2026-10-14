import {
  ErrandErrors,
  ErrandStatus,
  type CreateErrandRequest,
  type Errand,
  type ErrandLocation,
  type OperatingHours,
  type ServiceType,
} from '@relay/contracts'
import { ErrandRepository } from '../repositories/errand.repository.js'
import { ErrandServiceError, type AuthenticatedUser } from '../types/errand.types.js'
import { EventService } from './event.service.js'

export class ErrandService {
  constructor(
    private readonly repository: ErrandRepository,
    private readonly eventService: EventService,
  ) {}

  async createErrand(user: AuthenticatedUser, request: CreateErrandRequest): Promise<Errand> {
    if (!user.emailVerified) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'A verified email is required to create an errand.',
        403,
      )
    }

    const errand = await this.repository.create(user.sub, request)

    await this.eventService.onErrandCreated(errand)

    return errand
  }

  async getErrands(user: AuthenticatedUser): Promise<Errand[]> {
    return this.repository.listVisibleTo(user.sub)
  }

  async listBySupplier(supplierId: string): Promise<Errand[]> {
    return this.repository.listBySupplier(supplierId)
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    return this.repository.listOpenBySupplier(supplierId)
  }

  async getErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }
    return errand
  }

  async acceptErrand(courier: AuthenticatedUser, id: string): Promise<Errand> {
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

    const updated = await this.repository.assignCourier(id, courier.sub)

    await this.eventService.onErrandStatusChanged(
      updated.id,
      ErrandStatus.Accepted,
      ErrandStatus.Open,
      courier.sub,
      'courier',
      updated.requesterSub,
    )

    return updated
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

    const cancelled = await this.repository.cancel(id)

    await this.eventService.onErrandCancelled(
      cancelled.id,
      user.sub,
      undefined,
      cancelled.requesterSub,
    )

    return cancelled
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

    const updated = await this.repository.deliver(id)

    await this.eventService.onErrandStatusChanged(
      updated.id,
      ErrandStatus.Delivered,
      ErrandStatus.PickedUp,
      user.sub,
      'courier',
      updated.requesterSub,
    )

    return updated
  }

  async confirmErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

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

    const confirmed = await this.repository.confirm(id)

    await this.eventService.onErrandCompleted(confirmed)

    return confirmed
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

    const updated = await this.repository.pickUp(id)

    await this.eventService.onErrandStatusChanged(
      updated.id,
      ErrandStatus.PickedUp,
      ErrandStatus.Accepted,
      user.sub,
      'courier',
      updated.requesterSub,
    )

    return updated
  }

  async dropErrand(courier: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, courier.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    if (errand.courierSub !== courier.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'Only the assigned courier can drop this errand.',
        403,
      )
    }

    if (errand.status !== 'ACCEPTED') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Only accepted errands can be dropped.',
        409,
      )
    }

    const now = new Date()
    const isExpired = errand.expiresAt && new Date(errand.expiresAt) <= now

    let status: ErrandStatus
    let publishStatus: ErrandStatus

    if (isExpired) {
      // If deadline exceeded, set to expired
      status = ErrandStatus.Expired
      publishStatus = ErrandStatus.Expired
    } else {
      // Change state from accepted to open
      status = ErrandStatus.Open
      publishStatus = ErrandStatus.Open
    }

    const updated = await this.repository.dropCourier(id, status)

    await this.eventService.onErrandStatusChanged(
      updated.id,
      publishStatus,
      ErrandStatus.Accepted,
      courier.sub,
      'courier',
      updated.requesterSub,
    )

    if (isExpired) {
      await this.eventService.onErrandExpired(updated.id)
    }

    return updated
  }

  async deleteErrand(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.repository.findVisibleById(id, user.sub)
    if (!existing) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    const allowedStatuses: ErrandStatus[] = ['CANCELLED', 'EXPIRED', 'CONFIRMED']
    if (!allowedStatuses.includes(existing.status)) {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Errands in this state cannot be deleted. Only cancelled, expired, or confirmed errands can be deleted.',
        409,
      )
    }

    if (existing.requesterSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'You can only delete your own errands.',
        403,
      )
    }

    await this.repository.deleteErrand(id)

    await this.eventService.onErrandDeleted(id, user.sub)
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

    const allErrands = await this.repository.listBySupplier(event.supplierId)
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
