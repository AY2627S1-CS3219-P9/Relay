import type { ServiceType as SupplierServiceType } from '../supplier/models'

/** Request to estimate credit for an errand. */
export type EstimateCreditRequest = {
  name: string
  description: string
  serviceType: SupplierServiceType
}
