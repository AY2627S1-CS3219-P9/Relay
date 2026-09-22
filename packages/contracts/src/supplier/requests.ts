import type { Location, ServiceType, OperatingHours } from './models'

/** Request to create a new supplier (admin only) */
export interface CreateSupplierRequest {
  name: string
  location: Location
  isOperational: boolean
  operatingHours: OperatingHours
  serviceTypes: ServiceType[]
}

/** Request to update an existing supplier (admin only) */
export interface UpdateSupplierRequest {
  name?: string
  location?: Location
  isOperational?: boolean
  operatingHours?: OperatingHours
  serviceTypes?: ServiceType[]
}
