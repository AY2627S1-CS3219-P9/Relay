/** States in the errand lifecycle. */
export const OrderStatus = {
  Open: 'OPEN',
  Accepted: 'ACCEPTED',
  PickedUp: 'PICKED_UP',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
  Expired: 'EXPIRED',
  Confirmed: 'CONFIRMED',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

/** A location snapshot stored with an order. */
export type OrderLocation = {
  lat: number
  lng: number
  description: string
}

/** Delivery information owned by the Order Service. */
export type DeliveryDetails = {
  address: string
  instructions?: string
}

/** The public Order Service representation of an errand. */
export type Order = {
  id: string
  /** Cognito sub of the user who created the errand. */
  requesterSub: string
  /** Cognito sub of the assigned courier, when accepted. */
  courierSub: string | null
  /** Supplier Service identifier, when a supplier is selected. */
  supplierId: string | null
  pickupLocation: OrderLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  status: OrderStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}
