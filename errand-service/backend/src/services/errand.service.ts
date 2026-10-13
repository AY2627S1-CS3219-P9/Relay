import { 
  ErrandErrors, 
  type CreateErrandRequest, 
  type Errand,
  type GetErrandsOptions,
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

  async getErrand(user: AuthenticatedUser, id: string): Promise<Errand> {
    await this.repository.expireOpenErrands()
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
}
