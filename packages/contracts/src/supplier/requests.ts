import type { Location, OperatingHours, ServiceType, SupplierId } from './models'

/** Required fields for creating or replacing a supplier record. */
export type SupplierInput = {
  name: string
  location: Location
  isOperational: boolean
  operatingHours: OperatingHours
  serviceTypes: ServiceType[]
}

export type AddSupplierRequest = SupplierInput

export type UpdateSupplierRequest = SupplierInput

export type GetSupplierRequest = {
  supplierId: SupplierId
}

export type RemoveSupplierRequest = {
  supplierId: SupplierId
}
