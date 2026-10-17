import type {
  ValidateSupplierSelectionRequest,
  ValidateSupplierSelectionResponse,
} from '@relay/contracts'
import { ErrandErrors } from '@relay/contracts'
import { getEnv, type ErrandEnv } from '../config/env.js'
import { ErrandServiceError } from '../types/errand.types.js'

export class SupplierClient {
  constructor(private readonly configuredEnv?: ErrandEnv) {}

  async validateSelection(request: ValidateSupplierSelectionRequest): Promise<void> {
    const env = this.configuredEnv ?? getEnv()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), env.supplierTimeoutMs)

    try {
      const response = await fetch(`${env.supplierApiUrl}/internal/suppliers/validate-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supplier-service-token': env.supplierServiceToken,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new ErrandServiceError(
          ErrandErrors.SUPPLIER_UNAVAILABLE,
          `Supplier Service request failed (${response.status}).`,
          503,
        )
      }

      const result = (await response.json()) as ValidateSupplierSelectionResponse
      if (result.valid) return

      throw new ErrandServiceError(ErrandErrors.INVALID_ERRAND, result.message, 400, {
        supplierId: result.message,
      })
    } catch (error) {
      if (error instanceof ErrandServiceError) throw error
      throw new ErrandServiceError(
        ErrandErrors.SUPPLIER_UNAVAILABLE,
        'Supplier Service is unavailable.',
        503,
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
