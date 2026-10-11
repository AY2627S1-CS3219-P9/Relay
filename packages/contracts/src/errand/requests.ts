import type { DeliveryDetails, ErrandLocation } from './models'

/** Request to create an errand. The requester is taken from the session. */
export type CreateErrandRequest = {
  supplierId?: string
  pickupLocation: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  expiresAt?: string
}

