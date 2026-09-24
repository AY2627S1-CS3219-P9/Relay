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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${supplierApiBaseUrl}${path}`, {
    ...init,
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

export const httpSupplierApi: SupplierApi = {
  getSuppliers(): Promise<GetSuppliersResponse> {
    return request<GetSuppliersResponse>('')
  },

  getSupplier(id: string): Promise<GetSupplierResponse> {
    return request<GetSupplierResponse>(`/${encodeURIComponent(id)}`)
  },

  addSupplier(requestBody: CreateSupplierRequest): Promise<CreateSupplierResponse> {
    return request<CreateSupplierResponse>('', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  },

  updateSupplier(id: string, requestBody: UpdateSupplierRequest): Promise<UpdateSupplierResponse> {
    return request<UpdateSupplierResponse>(`/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    })
  },

  removeSupplier(id: string): Promise<void> {
    return request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
