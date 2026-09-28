import type {
  ChangePasswordRequest,
  DeleteUserRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  SubmitOtpAndLoginRequest,
  UpdateUserRequest,
} from './requests'
import type {
  ApiResult,
  GetSessionResponse,
  GetUserResponse,
  LoginResponse,
  RegisterResponse,
  SubmitOtpAndLoginResponse,
  UpdateUserResponse,
  ValidateSessionResponse,
} from './responses'

/**
 * Browser-facing boundary implemented by the User Service HTTP adapter.
 *
 * ## Session model
 *
 * Successful login and verification establish an opaque, server-side session.
 * The browser receives only a `relay_session` cookie with `HttpOnly`, `Secure`,
 * `SameSite=Lax`, and `Path=/` attributes. Cognito tokens, when used, remain
 * internal to the User Service. Browser adapters must use
 * `credentials: 'include'`; callers never pass raw session tokens.
 *
 * `logout()` revokes the server-side session and clears the cookie. Stateful
 * requests must be protected by origin validation or CSRF protection.
 *
 * ## Result and HTTP model
 *
 * Every method resolves to `ApiResult`. Expected API errors do not throw. The
 * corresponding HTTP response is non-2xx and has `{ ok: false, error }` as its
 * JSON body. Network, malformed-response, and adapter failures may reject.
 *
 * Public HTTP routes are:
 * - `POST /api/user/auth/register`
 * - `POST /api/user/auth/verification/resend`
 * - `POST /api/user/auth/verification/confirm-and-login`
 * - `POST /api/user/auth/login`
 * - `POST /api/user/auth/logout`
 * - `GET /api/user/session`
 * - `POST /api/user/auth/password`
 * - `GET`, `PATCH`, and `DELETE /api/user/me`
 */
export interface UserApi {
  /** Creates an unverified account and sends a verification code. */
  register(request: RegisterRequest): Promise<ApiResult<RegisterResponse>>

  /** Sends a replacement verification code to an unverified email address. */
  resendVerification(request: ResendVerificationRequest): Promise<ApiResult<undefined>>

  /** Verifies the code, signs the user in, and establishes a session cookie. */
  submitOtpAndLogin(
    request: SubmitOtpAndLoginRequest,
  ): Promise<ApiResult<SubmitOtpAndLoginResponse>>

  /** Signs the user in and establishes a session cookie. */
  login(request: LoginRequest): Promise<ApiResult<LoginResponse>>

  /** Revokes the current session and clears its cookie. */
  logout(): Promise<ApiResult<undefined>>

  /** Returns the identity and role associated with the current session. */
  getSession(): Promise<ApiResult<GetSessionResponse>>

  /** Changes the password associated with the current authenticated identity. */
  changePassword(request: ChangePasswordRequest): Promise<ApiResult<undefined>>

  /** Returns the current user's complete Relay profile. */
  getUser(): Promise<ApiResult<GetUserResponse>>

  /** Creates or updates the current user's profile and returns the complete profile. */
  updateUser(request: UpdateUserRequest): Promise<ApiResult<UpdateUserResponse>>

  /** Deletes the current identity and profile, then revokes the session. */
  deleteUser(request: DeleteUserRequest): Promise<ApiResult<undefined>>
}

/**
 * Private backend-to-backend session validation boundary.
 *
 * This is deliberately separate from `UserApi`: browser clients call
 * `getSession()`, while Supplier, Order, and Credit forward the original
 * browser `Cookie` header to `POST /internal/user/session/validate` and
 * authenticate themselves with a service credential. No service accepts a
 * browser session token in a query parameter or calls Cognito directly. The
 * private endpoint returns the same `ApiResult<Session>` shape as this method.
 */
export interface UserSessionValidatorApi {
  validateSession(): Promise<ApiResult<ValidateSessionResponse>>
}
