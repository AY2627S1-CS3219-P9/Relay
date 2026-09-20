import type { SessionId } from './models'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  SubmitOtpRequest,
  UpdateUserRequest,
} from './requests'
import type {
  GetUserResponse,
  IsVerifiedResponse,
  LoginResponse,
  RegisterResponse,
  SubmitOtpResponse,
  UpdateUserResponse,
} from './responses'

/** Async boundary implemented by an HTTP adapter in the User UI. */
export interface UserApi {
  register(request: RegisterRequest): Promise<RegisterResponse>
  requestOtp(sessionId: SessionId): Promise<void>
  submitOtp(request: SubmitOtpRequest): Promise<SubmitOtpResponse>
  login(request: LoginRequest): Promise<LoginResponse>
  isVerified(sessionId: SessionId): Promise<IsVerifiedResponse>
  getUser(sessionId: SessionId): Promise<GetUserResponse>
  updateUser(sessionId: SessionId, request: UpdateUserRequest): Promise<UpdateUserResponse>
  changePassword(sessionId: SessionId, request: ChangePasswordRequest): Promise<void>
  deleteUser(sessionId: SessionId, confirmation: string): Promise<void>
}
