/** Machine-readable errors returned by the Order Service. */
export const OrderErrors = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INSUFFICIENT_CREDIT: 'INSUFFICIENT_CREDIT',
  SUPPLIER_UNAVAILABLE: 'SUPPLIER_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type OrderErrorCode = (typeof OrderErrors)[keyof typeof OrderErrors]

export type OrderError = {
  code: OrderErrorCode
  message: string
  fieldErrors?: Record<string, string>
}
