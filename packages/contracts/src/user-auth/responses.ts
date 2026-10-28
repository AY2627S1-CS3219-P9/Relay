import type { UserApiError } from './errors'
import type { JwtAccessToken } from './models'
export type ApiSuccess<T> = { ok: true; data: T }
export type ApiFailure = { ok: false; error: UserApiError }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure
export type RegisterResponse = { verificationRequired: true }
export type LoginResponse = { accessToken: JwtAccessToken; tokenType: 'Bearer'; expiresIn: number }
export type SubmitOtpAndLoginResponse = LoginResponse
