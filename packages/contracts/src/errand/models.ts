import type { Location, ServiceType, OperatingHours } from '../supplier/models'

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

/** Public listing scopes supported by the Errand Service. */
export type ErrandListScope = 'mine' | 'visible'

/** Supplier-facing views served through an authenticated backend boundary. */
export type SupplierErrandViewScope = 'explore' | 'mine'

/** A location snapshot stored with an errand (same shape as supplier.Location). */
export type ErrandLocation = Location

/** Delivery information owned by the Errand Service. */
export type DeliveryDetails = {
  description: string
  instructions?: string
}

/** The public Errand Service representation of an errand. */
export type Errand = {
  id: string
  name: string
  /** Cognito sub of the user who created the errand. */
  requesterSub: string
  /** Cognito sub of the assigned courier, when accepted. */
  courierSub: string | null
  supplierId: string
  pickupLocation: ErrandLocation
  deliveryDetails: DeliveryDetails
  creditAmount: number
  status: ErrandStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
  supplierName: string
  serviceType: number
}

/** Supplier change event for errand service notifications. */
export type SupplierInfoEvent = {
  supplierId: string
  name?: string
  location?: ErrandLocation
  operatingHours?: OperatingHours
  isOperational?: boolean
  serviceTypes?: ServiceType[]
}

/** Privacy-safe errand projection used by supplier map and detail views. */
export type SupplierErrandSummary = Omit<Errand, 'requesterSub' | 'courierSub' | 'supplierId'> & {
  supplierId: string
}
