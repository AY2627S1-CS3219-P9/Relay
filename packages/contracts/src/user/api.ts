import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpAndLoginRequest,
  UpdateUserRequest,
} from './requests'
import type {
  GetUserResponse,
  LoginResponse,
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
  changePassword(request: ChangePasswordRequest): Promise<void>
  logout(): Promise<void>
  getUser(): Promise<GetUserResponse>
  updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>
  deleteUser(confirmation: string): Promise<void>
}
