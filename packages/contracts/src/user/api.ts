import type {
  ChangePasswordRequest,
  CheckAuthRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpAndLoginRequest,
  UpdateUserRequest,
} from './requests'
import type {
  ChangePasswordResponse,
  CheckAuthResponse,
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
  checkAuth(request: CheckAuthRequest): Promise<CheckAuthResponse>  
  getUser(): Promise<GetUserResponse>
  updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>
  deleteUser(confirmation: string): Promise<void>
}
