import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpAndLoginRequest,
  UpdateUserRequest,
} from './requests'
import type {
  ChangePasswordResponse,
  GetUserResponse,
  LoginResponse,
  LogoutResponse,
  RegisterResponse,
  ResendOtpResponse,
  SubmitOtpAndLoginResponse,
  UpdateUserResponse,
} from './responses'

/** Async boundary implemented by an HTTP adapter in the User UI. */
export interface UserApi {
  register(request: RegisterRequest): Promise<RegisterResponse>
  resendOtp(email: string): Promise<ResendOtpResponse>
  submitOtpAndLogin(request: SubmitOtpAndLoginRequest): Promise<SubmitOtpAndLoginResponse>
  login(request: LoginRequest): Promise<LoginResponse>
  changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse>
  logout(): Promise<LogoutResponse>
  getUser(): Promise<GetUserResponse>
  updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>
  deleteUser(confirmation: string): Promise<void>
}
