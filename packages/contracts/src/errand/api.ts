import type { CreateErrandRequest } from './requests'
import type { SupplierInfoEvent } from './models'
import type {
  CreateErrandResponse,
  DeleteErrandResponse,
  GetErrandResponse,
  GetErrandsResponse,
  ListOpenBySupplierResponse,
  AcceptErrandResponse,
  PickupErrandResponse,
  DeliverErrandResponse,
  ConfirmErrandResponse,
  CancelErrandResponse,
  SupplierEventsResponse,
} from './responses'

/** Browser-facing Errand Service boundary. */
export interface ErrandApi {
  /** Create an errand for the authenticated requester. */
  createErrand(request: CreateErrandRequest): Promise<CreateErrandResponse>

  /** List errands visible to the authenticated user. */
  getErrands(): Promise<GetErrandsResponse>

  /** List open errands for a specific supplier (for courier discovery when viewing supplier). */
  listOpenBySupplier(supplierId: string): Promise<ListOpenBySupplierResponse>

  /** List all errands for a specific supplier (when viewing supplier details). */
  listBySupplier(supplierId: string): Promise<GetErrandsResponse>

  /** Retrieve an errand visible to the authenticated user. */
  getErrand(id: string): Promise<GetErrandResponse>

  /** Accept an open errand (courier only). */
  acceptErrand(id: string): Promise<AcceptErrandResponse>

  /** Pick up the errand (courier only). */
  pickupErrand(id: string): Promise<PickupErrandResponse>

  /** Deliver the errand (courier only). */
  deliverErrand(id: string): Promise<DeliverErrandResponse>

  /** Confirm the delivered errand has been received (requester only). */
  confirmErrand(id: string): Promise<ConfirmErrandResponse>

  /** Cancel an accepted errand (courier or requester). */
  cancelErrand(id: string): Promise<CancelErrandResponse>

  /** Delete an eligible errand owned by the authenticated requester. */
  deleteErrand(id: string): Promise<DeleteErrandResponse>
}

/**
 * Internal Errand Service boundary for supplier event processing.
 * Not exposed to browsers; authenticated with service token.
 */
export interface ErrandInternalApi {
  /** Receive supplier change notifications from Supplier Service. */
  receiveSupplierEvents(event: SupplierInfoEvent): Promise<SupplierEventsResponse>
}
