import type {
  ChangePasswordRequest,
  IsAdminRequest,
  IsAuthenticatedRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpAndLoginRequest,
} from './requests'
import type {
  IsAdminResponse,
  IsAuthenticatedResponse,
  LoginResponse,
  RegisterResponse,
  ResendOtpResponse,
  SubmitOtpAndLoginResponse,
} from './responses'

/** Async boundary implemented by an HTTP adapter in the User UI. */
export interface UserApi {
  register(request: RegisterRequest): Promise<RegisterResponse>
  resendOtp(email: string): Promise<ResendOtpResponse>
  submitOtpAndLogin(request: SubmitOtpAndLoginRequest): Promise<SubmitOtpAndLoginResponse>
  login(request: LoginRequest): Promise<LoginResponse>
  changePassword(request: ChangePasswordRequest): Promise<void>
  logout(): Promise<void>
  isAuthenticated(request: IsAuthenticatedRequest): Promise<IsAuthenticatedResponse>
  isAdmin(request: IsAdminRequest): Promise<IsAdminResponse>
}
