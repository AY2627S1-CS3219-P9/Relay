import type {
  DeliveryDetails,
  ErrandListScope,
  ErrandLocation,
  SupplierErrandViewScope,
} from './models'

/** Request to create an errand. The requester is taken from the session. */
export type CreateErrandRequest = {
  supplierId: string
  name: string
  pickupLocation: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  expiresAt?: string
  serviceType: number
  supplierName: string
}

/** Request to accept an errand. No body needed - authenticated via session. */
export type AcceptErrandRequest = {}

/** Request to cancel an errand. No body needed - authenticated via session. */
export type CancelErrandRequest = {}

export type GetErrandsOptions = {
  scope?: ErrandListScope
}

export type SupplierErrandViewRequest = {
  scope: SupplierErrandViewScope
  supplierId?: string
}
