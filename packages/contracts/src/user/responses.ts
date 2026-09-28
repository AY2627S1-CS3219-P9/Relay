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

export type LoginResponseData = {
  emailVerified: boolean
  profileCreated: boolean
}

export type UserApiResponse<T, E extends UserApiError> =
  | ([T] extends [never] ? { success: true } : { success: true; data: T })
  | { success: false; error: E }

export type RegisterResponse = UserApiResponse<never, RegisterError>
export type ResendOtpResponse = UserApiResponse<never, ResendOtpError>
export type SubmitOtpAndLoginResponse = UserApiResponse<LoginResponseData, SubmitOtpAndLoginError>
export type LoginResponse = UserApiResponse<LoginResponseData, LoginError>

export type CheckAuthResponseData = {
  role: UserRole
}

export type CheckAuthResponse = UserApiResponse<CheckAuthResponseData, CheckAuthError>
export type GetUserResponse = User
export type UpdateUserResponse = User

export type ChangePasswordResponse = UserApiResponse<never, ChangePasswordError>
export type LogoutResponse = UserApiResponse<never, LogoutError>
