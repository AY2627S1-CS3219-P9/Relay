import type { UserApiError } from './errors'
import type { Session, User } from './models'

/** Successful User API result. */
export type ApiSuccess<T> = {
  ok: true
  data: T
}

/** Expected User API failure. Transport and network failures may still reject. */
export type ApiFailure = {
  ok: false
  error: UserApiError
}

/**
 * Uniform result returned by every public UserApi method.
 *
 * The HTTP adapter converts a successful 204 response to
 * `{ ok: true, data: undefined }`.
 */
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export type RegisterResponse = {
  verificationRequired: true
}

export type LoginResponse = Session
export type SubmitOtpAndLoginResponse = Session
export type GetSessionResponse = Session
export type GetUserResponse = User
export type UpdateUserResponse = User

/** Result returned by the private service-to-service session validator. */
export type ValidateSessionResponse = Session
