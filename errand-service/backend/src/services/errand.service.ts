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
import { translateError } from '../utils/translate-error.js'

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
    const errands =
      options.scope === 'mine'
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

    try {
      const updated = await this.repository.accept(id, courier.sub)
      return this.enrichCourierProfile(updated)
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async cancelErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    try {
      return this.enrichCourierProfile(await this.repository.cancel(id, user.sub))
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async deliverErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    try {
      return this.enrichCourierProfile(await this.repository.deliver(id, user.sub))
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async confirmErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.confirmDeliveredErrands()

    try {
      return this.enrichCourierProfile(await this.repository.confirm(id, user.sub))
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async pickUpErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    try {
      return this.enrichCourierProfile(await this.repository.pickUp(id, user.sub))
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async dropErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    try {
      return this.enrichCourierProfile(await this.repository.drop(id, user.sub))
    } catch (error) {
      throw translateError(error as Error)
    }
  }

  async deleteErrand(user: AuthenticatedUser, id: string): Promise<void> {
    try {
      await this.repository.delete(id, user.sub)
    } catch (error) {
      throw translateError(error as Error)
    }
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
        (e) => e.status === ErrandStatus.Open || e.status === ErrandStatus.Accepted,
      )
      for (const errand of openAcceptedErrands) {
        await this.repository.delete(errand.id, errand.requesterSub)
      }
      return {
        processed: true,
        affectedErrandIds: openAcceptedErrands.map((e) => e.id),
      }
    }

    // Otherwise, update errands with new supplier information
    const affectedErrands = allErrands.filter(
      (e) => e.status === ErrandStatus.Open || e.status === ErrandStatus.Accepted,
    )
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
