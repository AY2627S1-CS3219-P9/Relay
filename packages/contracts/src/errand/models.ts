/** States in the errand lifecycle. */
export const ErrandStatus = {
  Open: 'OPEN',
  Accepted: 'ACCEPTED',
  PickedUp: 'PICKED_UP',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
  Expired: 'EXPIRED',
  Confirmed: 'CONFIRMED',
} as const

export type ErrandStatus = (typeof ErrandStatus)[keyof typeof ErrandStatus]

/** A location snapshot stored with an errand. */
export type ErrandLocation = {
  lat: number
  lng: number
  buildingName: string
  floorNumber: number
}

/** Delivery information owned by the Errand Service. */
export type DeliveryDetails = {
  description: string
  instructions?: string
}

/** The public Errand Service representation of an errand. */
export type Errand = {
  id: string
  /** Cognito sub of the user who created the errand. */
  requesterSub: string
  /** Cognito sub of the assigned courier, when accepted. */
  courierSub: string | null
  /** Supplier Service identifier, when a supplier is selected. */
  supplierId: string | null
  pickupLocation: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  status: ErrandStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}
