import type { DeliveryDetails, ErrandLocation } from './models'

/** Request to create an errand. The requester is taken from the session. */
export type CreateErrandRequest = {
  supplierId: string
  pickupLocation: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  expiresAt?: string
}

/** Request to accept an errand. No body needed - authenticated via session. */
export type AcceptErrandRequest = {}

/** Request to cancel an errand. No body needed - authenticated via session. */
export type CancelErrandRequest = {}
