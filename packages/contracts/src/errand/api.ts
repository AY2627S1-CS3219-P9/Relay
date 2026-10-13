import type {
  CreateErrandRequest,
  GetErrandsOptions,
  SupplierErrandViewRequest,
} from './requests'
import type {
  CreateErrandResponse,
  DeleteErrandResponse,
  GetErrandResponse,
  GetErrandsResponse,
  GetSupplierErrandViewResponse,
} from './responses'

/** Browser-facing Errand Service boundary. */
export interface ErrandApi {
  /** Create an errand for the authenticated requester. */
  createErrand(request: CreateErrandRequest): Promise<CreateErrandResponse>

  /** List errands visible to the authenticated user. */
  getErrands(options?: GetErrandsOptions): Promise<GetErrandsResponse>

  /** List errands for a selected supplier in the authenticated user's view. */
  getSupplierErrandView(
    request: SupplierErrandViewRequest,
  ): Promise<GetSupplierErrandViewResponse>

  /** Retrieve an errand visible to the authenticated user. */
  getErrand(id: string): Promise<GetErrandResponse>

  /** Delete an eligible errand owned by the authenticated requester. */
  deleteErrand(id: string): Promise<DeleteErrandResponse>
}
