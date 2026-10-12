import type { CreateErrandRequest } from './requests'
import type { SupplierInfoEvent } from './models'
import type {
  CreateErrandResponse,
  DeleteErrandResponse,
  GetErrandResponse,
  GetErrandsResponse,
  SupplierEventsResponse,
} from './responses'

/** Browser-facing Errand Service boundary. */
export interface ErrandApi {
  /** Create an errand for the authenticated requester. */
  createErrand(request: CreateErrandRequest): Promise<CreateErrandResponse>

  /** List errands visible to the authenticated user. */
  getErrands(): Promise<GetErrandsResponse>

  /** Retrieve an errand visible to the authenticated user. */
  getErrand(id: string): Promise<GetErrandResponse>

  /** Delete an eligible errand owned by the authenticated requester. */
  deleteErrand(id: string): Promise<DeleteErrandResponse>

  /**
   * Supplier event receiver (internal).
   * Receives supplier change notifications from the Supplier Service.
   * Authenticates with `x-errand-service-token` header.
   */
  receiveSupplierEvents(event: SupplierInfoEvent): Promise<SupplierEventsResponse>
}
