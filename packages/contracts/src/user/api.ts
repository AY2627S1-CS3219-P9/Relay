import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpAndLoginRequest,
} from './requests'
import type {
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
  // TODO: Add other api functions
}
