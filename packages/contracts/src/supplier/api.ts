import type { SessionId } from '../user'
import type {
  AddSupplierRequest,
  UpdateSupplierRequest,
} from './requests'
import type { Supplier, SupplierId } from './models'

/** Async boundary implemented by an HTTP adapter in the Supplier UI. */
export interface SupplierApi {
  getSuppliers(sessionId: SessionId): Promise<Supplier[]>
  getSupplier(sessionId: SessionId, supplierId: SupplierId): Promise<Supplier>
  addSupplier(sessionId: SessionId, request: AddSupplierRequest): Promise<Supplier>
  updateSupplier(
    sessionId: SessionId,
    supplierId: SupplierId,
    request: UpdateSupplierRequest,
  ): Promise<Supplier>
  removeSupplier(sessionId: SessionId, supplierId: SupplierId): Promise<void>
}
