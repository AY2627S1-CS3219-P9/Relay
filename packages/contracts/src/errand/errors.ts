/** Machine-readable errors returned by the Errand Service. */
export const ErrandErrors = {
  INVALID_ERRAND: 'INVALID_ERRAND',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INSUFFICIENT_CREDIT: 'INSUFFICIENT_CREDIT',
  SUPPLIER_UNAVAILABLE: 'SUPPLIER_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrandErrorCode = (typeof ErrandErrors)[keyof typeof ErrandErrors]

export type ErrandError = {
  code: ErrandErrorCode
  message: string
  fieldErrors?: Record<string, string>
}
