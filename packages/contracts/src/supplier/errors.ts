/** Supplier-related errors with machine-readable codes */
export const SupplierErrors = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
} as const

export type SupplierErrorCode = typeof SupplierErrors[keyof typeof SupplierErrors]

/** Error response structure used across Supplier service endpoints */
export interface SupplierError {
  code: SupplierErrorCode
  message: string
}
