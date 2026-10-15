import type { ErrandApi } from '@relay/contracts'

const baseUrl = '/api/errands'

export const hostErrandApi: ErrandApi = {
  async createErrand(body) {
    return request('', { method: 'POST', body: JSON.stringify(body) })
  },
  async getErrands(options) {
    const query = options?.scope ? `?scope=${encodeURIComponent(options.scope)}` : ''
    return request(query)
  },
  async listOpenBySupplier(supplierId) {
    return request(`/by-supplier/${encodeURIComponent(supplierId)}`)
  },
  async getSupplierErrandView(options) {
    const query = new URLSearchParams({ scope: options.scope, supplierId: options.supplierId })
    return request(`/supplier-view?${query.toString()}`)
  },
  async getErrand(id) { return request(`/${encodeURIComponent(id)}`) },
  async acceptErrand(id) { return request(`/${encodeURIComponent(id)}/accept`, { method: 'POST' }) },
  async pickupErrand(id) { return request(`/${encodeURIComponent(id)}/pickup`, { method: 'POST' }) },
  async deliverErrand(id) { return request(`/${encodeURIComponent(id)}/deliver`, { method: 'POST' }) },
  async confirmErrand(id) { return request(`/${encodeURIComponent(id)}/confirm`, { method: 'POST' }) },
  async cancelErrand(id) { return request(`/${encodeURIComponent(id)}/cancel`, { method: 'POST' }) },
  async deleteErrand(id) { return request(`/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    let message = `Errand service request failed (${response.status}).`
    try { message = ((await response.json()) as { message?: string }).message ?? message } catch { /* status message */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
