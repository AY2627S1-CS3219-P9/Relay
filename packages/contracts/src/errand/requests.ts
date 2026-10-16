import type {
  DeliveryDetails,
  ErrandListScope,
  ErrandLocation,
  SupplierErrandViewScope,
} from './models'

/** Request to create an errand. The requester is taken from the session. */
export type CreateErrandRequest = {
  /** TODO: persist and validate this request name in the backend. */
  name?: string
  supplierId: string
  pickupLocation: ErrandLocation
  /** TODO: persist and validate this target location in the backend. */
  deliveryLocation?: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  expiresAt?: string
}

export type GetErrandsOptions = {
  scope?: ErrandListScope
}

export type SupplierErrandViewRequest = {
  scope: SupplierErrandViewScope
  supplierId: string
}

/** Request to accept an errand. No body needed - authenticated via session. */
export type AcceptErrandRequest = {}

/** Request to cancel an errand. No body needed - authenticated via session. */
export type CancelErrandRequest = {}
