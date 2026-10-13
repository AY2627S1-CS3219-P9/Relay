import type {
  CreateErrandRequest,
  CreateErrandResponse,
  DeleteErrandResponse,
  ErrandApi,
  GetErrandResponse,
  GetErrandsOptions,
  GetErrandsResponse,
  GetSupplierErrandViewResponse,
  SupplierErrandViewRequest,
} from '@relay/contracts/errand'

const errandApiBaseUrl = import.meta.env.VITE_ERRAND_API_URL ?? '/api/errands'

export class ErrandApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ErrandApiError'
  }
}

export function createHttpErrandApi(): ErrandApi {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${errandApiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      let message = `Errand service request failed (${response.status}).`
      try {
        const body = (await response.json()) as { message?: string }
        if (body.message) message = body.message
      } catch {
        // Keep the status-based message when the backend returned no JSON.
      }
      throw new ErrandApiError(message, response.status)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    createErrand: (requestBody: CreateErrandRequest) =>
      request<CreateErrandResponse>('', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    getErrands: (options?: GetErrandsOptions) => {
      const query = options?.scope ? `?scope=${encodeURIComponent(options.scope)}` : ''
      return request<GetErrandsResponse>(query)
    },
    getSupplierErrandView: (requestBody: SupplierErrandViewRequest) => {
      const params = new URLSearchParams({
        scope: requestBody.scope,
        supplierId: requestBody.supplierId,
      })
      return request<GetSupplierErrandViewResponse>(`/supplier-view?${params.toString()}`)
    },
    listOpenBySupplier: (supplierId: string) =>
      request<GetErrandsResponse>(`/by-supplier/${encodeURIComponent(supplierId)}`),
    getErrand: (id: string) => request<GetErrandResponse>(`/${encodeURIComponent(id)}`),
    acceptErrand: (id: string) =>
      request<import('@relay/contracts/errand').AcceptErrandResponse>(
        `/${encodeURIComponent(id)}/accept`,
        { method: 'POST' },
      ),
    pickupErrand: (id: string) =>
      request<import('@relay/contracts/errand').PickupErrandResponse>(
        `/${encodeURIComponent(id)}/pickup`,
        { method: 'POST' },
      ),
    deliverErrand: (id: string) =>
      request<import('@relay/contracts/errand').DeliverErrandResponse>(
        `/${encodeURIComponent(id)}/deliver`,
        { method: 'POST' },
      ),
    confirmErrand: (id: string) =>
      request<import('@relay/contracts/errand').ConfirmErrandResponse>(
        `/${encodeURIComponent(id)}/confirm`,
        { method: 'POST' },
      ),
    cancelErrand: (id: string) =>
      request<import('@relay/contracts/errand').CancelErrandResponse>(
        `/${encodeURIComponent(id)}/cancel`,
        { method: 'POST' },
      ),
    deleteErrand: (id: string) =>
      request<DeleteErrandResponse>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}

export const httpErrandApi = createHttpErrandApi()
