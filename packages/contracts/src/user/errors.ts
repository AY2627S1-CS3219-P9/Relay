/** Transport-neutral error payload for failed User API requests. */
export type UserApiError = {
  code:
    | 'INVALID_REQUEST'
    | 'INVALID_CREDENTIALS'
    | 'SESSION_EXPIRED'
    | 'OTP_INVALID'
    | 'EMAIL_NOT_VERIFIED'
    | 'ACCOUNT_LOCKED'
    | 'CONFLICT'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'INTERNAL_ERROR'
  message: string
  retryAfterSeconds?: number
  fieldErrors?: Record<string, string>
}
