import type { DeliveryDetails, OrderLocation } from './models'

/** Request to create an errand. The requester is taken from the session. */
export type CreateOrderRequest = {
  supplierId?: string
  pickupLocation: OrderLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  expiresAt?: string
}

