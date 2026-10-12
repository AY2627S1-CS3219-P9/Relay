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

  /**
   * Supplier event receiver (internal).
   * Receives supplier change notifications from the Supplier Service.
   * Authenticates with `x-errand-service-token` header.
   */
  receiveSupplierEvents(event: SupplierInfoEvent): Promise<SupplierEventsResponse>
}
