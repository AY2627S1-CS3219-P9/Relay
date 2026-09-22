import type { Supplier } from './models'

/** Response when listing multiple suppliers */
export interface GetSuppliersResponse {
  suppliers: Supplier[]
}

/** Response when retrieving a single supplier */
export interface GetSupplierResponse {
  supplier: Supplier
}

/** Response when creating a supplier */
export interface CreateSupplierResponse {
  supplier: Supplier
}

/** Response when updating a supplier */
export interface UpdateSupplierResponse {
  supplier: Supplier
}
