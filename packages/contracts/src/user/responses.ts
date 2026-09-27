import type { IsAuthenticatedError, IsAdminError, LoginError, RegisterError, ResendOtpError, SubmitOtpAndLoginError, UserApiError } from './errors'

type RegisterResponseData = never
type ResendOtpResponseData = never
export type LoginResponseData = {
  emailVerified: boolean
  profileCreated: boolean
}

export type UserApiResponse<T, E extends UserApiError> =
  | ([T] extends [never] ? { success: true } : { success: true; data: T })
  | { success: false; error: E }

export type RegisterResponse = UserApiResponse<RegisterResponseData, RegisterError>
export type ResendOtpResponse = UserApiResponse<ResendOtpResponseData, ResendOtpError>
export type SubmitOtpAndLoginResponse = UserApiResponse<LoginResponseData, SubmitOtpAndLoginError>
export type LoginResponse = UserApiResponse<LoginResponseData, LoginError>

export type IsAuthenticatedResponseData = {
  isAuthenticated: boolean
}

export type IsAdminResponseData = {
  isAdmin: boolean
}

export type IsAuthenticatedResponse = UserApiResponse<IsAuthenticatedResponseData, IsAuthenticatedError>
export type IsAdminResponse = UserApiResponse<IsAdminResponseData, IsAdminError>

