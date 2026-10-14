export type CreditErrorCode =
  | 'INVALID_REQUEST'       // 400
  | 'UNAUTHENTICATED'       // 401
  | 'USER_NOT_FOUND'        // 404
  | 'INVALID_CREDIT_AMOUNT' // 422
  | 'INSUFFICIENT_CREDITS'  // 422

export type CreditError = {
  code: CreditErrorCode
  message: string
}