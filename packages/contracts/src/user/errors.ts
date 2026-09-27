/** Transport-neutral error payload for failed User API requests. */
export type UserApiError = {
  code: string
  message: string
}

export type RegisterError = UserApiError & {
  code:
    | 'INVALID_EMAIL'
    | 'INVALID_PASSWORD'
    | 'NON_MATCHING_PASSWORDS'
    | 'EMAIL_CONFLICT'
    | 'TOO_MANY_REQUESTS'
    | 'UNKNOWN_ERROR'
}

export type ResendOtpError = UserApiError & {
  code: 'EMAIL_IS_VERIFIED' | 'LIMIT_EXCEEDED' | 'UNKNOWN_ERROR'
}

export type LoginError = UserApiError & {
  code: 'INCORRECT_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'TOO_MANY_REQUESTS' | 'UNKNOWN_ERROR'
}

// Note that submit otp will also login the user
export type SubmitOtpAndLoginError =
  | LoginError
  | (UserApiError & {
      code: 'EMAIL_IS_VERIFIED' | 'CODE_MISMATCH' | 'CODE_EXPIRED'
    })
