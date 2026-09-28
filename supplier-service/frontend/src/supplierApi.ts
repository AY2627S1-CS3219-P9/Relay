import { SupplierErrors } from '@relay/contracts'
import type {
  CreateSupplierRequest,
  CreateSupplierResponse,
  GetSupplierResponse,
  GetSuppliersResponse,
  SupplierApi,
  UpdateSupplierRequest,
  UpdateSupplierResponse,
  SupplierError,
  SupplierErrorCode,
} from '@relay/contracts'

const supplierApiBaseUrl = import.meta.env.VITE_SUPPLIER_API_URL ?? '/api/supplier'

export class SupplierApiError extends Error {
  constructor(
    public readonly code: SupplierErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'SupplierApiError'
  }
}

export function createHttpSupplierApi(): SupplierApi {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${supplierApiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      let error: Partial<SupplierError> = {}
      try {
        error = (await response.json()) as Partial<SupplierError>
      } catch {
        // Use the HTTP status when the backend has not returned JSON.
      }
      throw new SupplierApiError(
        error.code ?? SupplierErrors.INTERNAL_ERROR,
        error.message || `Supplier service request failed (${response.status}).`,
        response.status,
      )
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    getSuppliers: () => request<GetSuppliersResponse>(''),
    getSupplier: (id) => request<GetSupplierResponse>(`/${encodeURIComponent(id)}`),
    addSupplier: (requestBody) =>
      request<CreateSupplierResponse>('', { method: 'POST', body: JSON.stringify(requestBody) }),
    updateSupplier: (id, requestBody) =>
      request<UpdateSupplierResponse>(`/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      }),
    removeSupplier: (id) => request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}

export const httpSupplierApi: SupplierApi = createHttpSupplierApi()
