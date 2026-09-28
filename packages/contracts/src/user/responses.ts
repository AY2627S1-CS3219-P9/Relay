<<<<<<< HEAD
import type {
  ChangePasswordError,
  CheckAuthError,
  LoginError,
  LogoutError,
  RegisterError,
  ResendOtpError,
  SubmitOtpAndLoginError,
  UserApiError,
} from './errors'
import type { User, UserRole } from './models'
=======
import type { UserApiError } from './errors'
import type { Session, User } from './models'
>>>>>>> origin/main

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

<<<<<<< HEAD
export type ChangePasswordResponse = UserApiResponse<never, ChangePasswordError>
export type LogoutResponse = UserApiResponse<never, LogoutError>
=======
/** Result returned by the private service-to-service session validator. */
export type ValidateSessionResponse = Session
>>>>>>> origin/main
