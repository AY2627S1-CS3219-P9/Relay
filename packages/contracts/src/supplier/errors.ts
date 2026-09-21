/** Transport-neutral error payload for failed Supplier API requests. */
export type SupplierApiError = {
  code:
    | 'INVALID_REQUEST'
    | 'SESSION_EXPIRED'
    | 'FORBIDDEN'
    | 'CONFLICT'
    | 'NOT_FOUND'
    | 'INTERNAL_ERROR'
  message: string
  fieldErrors?: Record<string, string>
}
