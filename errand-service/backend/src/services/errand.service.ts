import {
  CreateErrandRequest,
  Errand,
  ErrandErrors,
  ErrandStatus,
  GetErrandsOptions,
  SupplierErrandSummary,
  SupplierErrandViewRequest,
  type ErrandLocation,
  type OperatingHours,
  type ServiceType,
} from '@relay/contracts'
import { ErrandRepository } from '../repositories/errand.repository.js'
import { ErrandServiceError, type AuthenticatedUser } from '../types/errand.types.js'
import { CreditClient } from '../clients/credit.client.js'
import { UserClient } from '../clients/user.client.js'
import { SupplierClient } from '../clients/supplier.client.js'
import { ErrandEventStream } from './errandEventStream.js'

export const LIFECYCLE_ORDER: Record<ErrandStatus, number> = {
  DELIVERED: 0,
  PICKED_UP: 1,
  ACCEPTED: 2,
  OPEN: 3,
  EXPIRED: 4,
  CANCELLED: 5,
  CONFIRMED: 6,
  DELETED: 7,
}

export class ErrandService {
  constructor(
    private readonly repository: ErrandRepository,
    private readonly creditClient: CreditClient = new CreditClient(),
    private readonly supplierClient: SupplierClient,
    private readonly userClient: UserClient = new UserClient(),
  ) {}

  getEventStream(): ErrandEventStream | undefined {
    return this.repository['eventStream'] as ErrandEventStream | undefined
  }

  async createErrand(user: AuthenticatedUser, request: CreateErrandRequest): Promise<Errand> {
    if (!user.emailVerified) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'A verified email is required to create an errand.',
        403,
      )
    }

    // Validate the supplier's current operational status before reserving credit
    // or creating any pending/database records. serviceType remains optional.
    try {
      await this.supplierClient.validateSelection({
        supplierId: request.supplierDetails.supplierId,
        serviceType: request.supplierDetails.serviceType as ServiceType,
      })
    } catch (error) {
      if (error instanceof ErrandServiceError) {
        if (error.code === ErrandErrors.SUPPLIER_UNAVAILABLE) {
          throw error
        }
        if (error.code === ErrandErrors.SUPPLIER_INACTIVE) {
          throw error
        }
        if (error.code === ErrandErrors.SERVICE_TYPE_NOT_OFFERED) {
          throw error
        }

        throw new ErrandServiceError(
          ErrandErrors.INVALID_ERRAND,
          error.message,
          error.statusCode,
          error.fieldErrors,
        )
      }
      throw error
    }

    const id = await this.repository.addPendingErrand(user.sub)
    try {
      await this.creditClient.reserve(id, user.sub, request.creditAmount)
      return this.repository.createErrand(id, user.sub, request)
    } catch (error) {
      // On failure, publish ERRAND_CREATION_FAILED to trigger credit release via Kafka
      await this.repository.publishCreationFailedEvent(id, user.sub)
      await this.repository.deletePendingErrand(id)
      throw error
    }
  }

  async getErrands(user: AuthenticatedUser, options: GetErrandsOptions = {}): Promise<Errand[]> {
    await this.processDueReadLifecycleTransitions()
    const errands = options.scope === 'mine'
      ? this.repository.listOwnedBy(user.sub)
      : this.repository.listVisibleTo(user.sub)
    return this.enrichCourierProfiles(await errands)
  }

  async getSupplierErrandView(
    user: AuthenticatedUser,
    request: SupplierErrandViewRequest,
  ): Promise<SupplierErrandSummary[]> {
    await this.processDueReadLifecycleTransitions()
    return this.repository.listSupplierView({ ...request, viewerSub: user.sub })
  }

  async listBySupplier(supplierId: string): Promise<Errand[]> {
    await this.processDueReadLifecycleTransitions()
    return this.enrichCourierProfiles(await this.repository.listBySupplier(supplierId))
  }

  async listOpenBySupplier(supplierId: string): Promise<Errand[]> {
    await this.repository.expireOpenErrands()
    return this.enrichCourierProfiles(await this.repository.listOpenBySupplier(supplierId))
  }

  async getErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    await this.processDueReadLifecycleTransitions()
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }
    return this.enrichCourierProfile(errand)
  }

  async acceptErrand(courier: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.expireOpenErrands()
    const errand = await this.repository.findOpenById(id)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }
    if (errand.expiresAt <= new Date().toISOString()) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand has expired.', 404)
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

    const maxReached = await this.repository.checkCourierReachMaxErrand(courier.sub)
    if (maxReached) {
      throw new ErrandServiceError(
        ErrandErrors.CONFLICT,
        `You already have the maximum number of errands assigned`,
        409,
      )
    }

    const updated = await this.repository.assignCourier(id, courier.sub)

    return this.enrichCourierProfile(updated)
  }

  async cancelErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    const errand = await this.repository.findVisibleById(id, user.sub)
    if (!errand) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

if (errand.requesterSub !== user.sub) {
      throw new ErrandServiceError(
        ErrandErrors.FORBIDDEN,
        'You do not have permission to cancel this errand.',
        403,
      )
    }

    if (errand.status !== 'OPEN') {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Only open errands can be cancelled.',
        409,
      )
    }

    const cancelled = await this.repository.cancel(id, user.sub)

    return this.enrichCourierProfile(cancelled)
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
      const message =
        errand.status === 'DELIVERED'
          ? 'Errand has already been delivered.'
          : 'Errand must be picked up before it can be delivered.';
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        message,
        409,
      )
    }

    const updated = await this.repository.deliver(id, user.sub)

    return this.enrichCourierProfile(updated)
  }

  async confirmErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.confirmDeliveredErrands()
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
      const message =
        errand.status === 'CONFIRMED'
          ? 'Errand has already been confirmed.'
          : 'Errand must be delivered before it can be confirmed.';
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        message,
        409,
      )
    }

    const confirmed = await this.repository.confirm(id)

    return this.enrichCourierProfile(confirmed)
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
      const message =
        errand.status === 'PICKED_UP'
          ? 'Errand has already been picked up.'
          : 'Errand must be accepted before it can be picked up.';
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        message,
        409,
      )
    }

    const updated = await this.repository.pickUp(id, user.sub)

    return this.enrichCourierProfile(updated)
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

    if (isExpired) {
      // If deadline exceeded, set to expired
      status = ErrandStatus.Expired
    } else {
      // Change state from accepted to open
      status = ErrandStatus.Open
    }

    const updated = await this.repository.dropCourier(id, status, courier.sub)

    return this.enrichCourierProfile(updated)
  }

  async deleteErrand(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.repository.findVisibleById(id, user.sub)
    if (!existing) {
      throw new ErrandServiceError(ErrandErrors.NOT_FOUND, 'Errand was not found.', 404)
    }

    const allowedStatuses: ErrandStatus[] = ['CANCELLED', 'EXPIRED', 'CONFIRMED', 'DELETED']
    if (!allowedStatuses.includes(existing.status)) {
      throw new ErrandServiceError(
        ErrandErrors.INVALID_TRANSITION,
        'Errands in this state cannot be deleted. Only cancelled, expired, confirmed, or deleted errands can be deleted.',
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

    await this.repository.deleteErrand(id, user.sub)
  }

  async receiveSupplierEvent(event: {
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

    // If supplier is no longer operational, mark open/accepted errands as DELETED
    if (event.isOperational === false) {
      const openAcceptedErrands = allErrands.filter(
        (e) => e.status === 'OPEN' || e.status === 'ACCEPTED',
      )
      for (const errand of openAcceptedErrands) {
        await this.repository.deleteErrand(errand.id, errand.requesterSub)
      }
      return {
        processed: true,
        affectedErrandIds: openAcceptedErrands.map((e) => e.id),
      }
    }

    // Otherwise, update errands with new supplier information
    const affectedErrands = allErrands.filter((e) => e.status === 'OPEN' || e.status === 'ACCEPTED')
    const affectedIds = affectedErrands.map((e) => e.id)

    if (affectedIds.length === 0) {
      return { processed: true, affectedErrandIds: [] }
    }

    await this.repository.updateErrandsBySupplier(event.supplierId, {
      name: event.name,
      location: event.location,
    })

    return { processed: true, affectedErrandIds: affectedIds }
  }

  private async enrichCourierProfiles(errands: Errand[]): Promise<Errand[]> {
    return Promise.all(errands.map((errand) => this.enrichCourierProfile(errand)))
  }

  private async processDueReadLifecycleTransitions(): Promise<void> {
    await this.repository.expireOpenErrands()
    await this.repository.confirmDeliveredErrands()
  }

  private async enrichCourierProfile(errand: Errand): Promise<Errand> {
    if (!errand.courierSub) return errand
    return {
      ...errand,
      courierProfile: await this.userClient.getProfile(errand.courierSub),
    }
  }
}
