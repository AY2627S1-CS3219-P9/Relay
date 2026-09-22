import type {
  CreateSupplierRequest,
  CreateSupplierResponse,
  GetSupplierResponse,
  GetSuppliersResponse,
  SupplierApi,
  UpdateSupplierRequest,
  UpdateSupplierResponse,
} from '@relay/contracts'

const supplierApiBaseUrl = import.meta.env.VITE_SUPPLIER_API_URL ?? '/api/supplier'

type ApiError = {
  code?: string
  message?: string
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
    let error: ApiError = {}
    try {
      error = (await response.json()) as ApiError
    } catch {
      // Use the HTTP status when the backend has not returned JSON.
    }
    throw new Error(error.message || `Supplier service request failed (${response.status}).`)
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
