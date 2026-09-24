import type {
  GetUserResponse,
  ImageDataUrl,
  IsVerifiedResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  SessionId,
  SubmitOtpRequest,
  SubmitOtpResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UserApi,
  UserProfile,
} from '@relay/contracts'
import { passwordErrors } from '../user/validation'

type Account = UserProfile & { password: string }
type PendingSession = { email: string; otp: string; issuedAt: number }

const accounts = new Map<string, Account>()
const sessions = new Map<string, string>()
const pendingSessions = new Map<string, PendingSession>()

const session = (sessionId: string) => ({
  sessionId: sessionId as SessionId,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
})

function error(
  code: Parameters<NonNullable<UserApi['register']>>[0] extends never ? never : string,
  message: string,
): never {
  throw { code, message }
}

function userSession(sessionId: SessionId) {
  const email = sessions.get(sessionId)
  if (!email) error('SESSION_EXPIRED', 'Your session has expired.')
  const account = accounts.get(email)
  if (!account) error('NOT_FOUND', 'User account was not found.')
  return account
}

function publicUser(account: Account): UserProfile {
  const { password: _password, ...profile } = account
  return profile
}

export const mockUserApi: UserApi = {
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const email = request.email.toLowerCase()
    if (accounts.has(email)) error('CONFLICT', 'An account with this email already exists.')
    accounts.set(email, {
      email,
      username: null,
      profilePictureUrl: null,
      emailVerified: false,
      role: request.role ?? 'user',
      password: request.password,
    })
    const sessionId = crypto.randomUUID()
    pendingSessions.set(sessionId, { email, otp: '123456', issuedAt: Date.now() })
    return { ...session(sessionId), verificationRequired: true }
  },

  async requestOtp(sessionId: SessionId) {
    const pending = pendingSessions.get(sessionId)
    if (!pending) error('SESSION_EXPIRED', 'Your session has expired.')
    pendingSessions.set(sessionId, { ...pending, otp: '123456', issuedAt: Date.now() })
  },

  async submitOtp(request: SubmitOtpRequest): Promise<SubmitOtpResponse> {
    const pending = pendingSessions.get(request.sessionId)
    if (!pending || Date.now() - pending.issuedAt > 5 * 60 * 1000)
      error('OTP_INVALID', 'That verification code is invalid or expired.')
    if (request.otp !== pending.otp)
      error('OTP_INVALID', 'That verification code is invalid or expired.')
    const account = accounts.get(pending.email)
    if (!account) error('NOT_FOUND', 'User account was not found.')
    account.emailVerified = true
    sessions.set(request.sessionId, pending.email)
    pendingSessions.delete(request.sessionId)
    return { ...session(request.sessionId), requiresProfileSetup: !account.username }
  },

  async login(request: LoginRequest): Promise<LoginResponse> {
    const account = accounts.get(request.email.toLowerCase())
    if (!account || account.password !== request.password)
      error('INVALID_CREDENTIALS', 'The email or password is incorrect.')
    if (!account.emailVerified) error('EMAIL_NOT_VERIFIED', 'Verify your email before logging in.')
    const sessionId = crypto.randomUUID()
    sessions.set(sessionId, account.email)
    return session(sessionId)
  },

  async isVerified(sessionId: SessionId): Promise<IsVerifiedResponse> {
    return { isVerified: userSession(sessionId).emailVerified }
  },

  async getUser(sessionId: SessionId): Promise<GetUserResponse> {
    return publicUser(userSession(sessionId))
  },

  async updateUser(sessionId: SessionId, request: UpdateUserRequest): Promise<UpdateUserResponse> {
    const account = userSession(sessionId)
    if (
      request.username &&
      [...accounts.values()].some(
        (candidate) => candidate.email !== account.email && candidate.username === request.username,
      )
    ) {
      error('CONFLICT', 'That username is already taken.')
    }
    if (request.username !== undefined) account.username = request.username
    if (request.profilePicture !== undefined) account.profilePictureUrl = request.profilePicture
    return {
      email: account.email,
      username: account.username,
      profilePictureUrl: account.profilePictureUrl,
    }
  },

  async changePassword(sessionId, request) {
    const account = userSession(sessionId)
    if (account.password !== request.currentPassword)
      error('INVALID_CREDENTIALS', 'The current password is incorrect.')
    if (passwordErrors(request.newPassword).length)
      error('INVALID_REQUEST', 'The new password does not meet the requirements.')
    if (request.newPassword !== request.newPasswordConfirmation)
      error('INVALID_REQUEST', 'The new passwords must match exactly.')
    account.password = request.newPassword
  },
  async logout(sessionId) {
    userSession(sessionId)
    sessions.delete(sessionId)
  },
  async deleteUser(sessionId: SessionId, confirmation: string) {
    const account = userSession(sessionId)
    if (!account.username || confirmation !== account.username)
      error('INVALID_REQUEST', 'Enter your username to confirm account deletion.')
    accounts.delete(account.email)
    sessions.delete(sessionId)
  },
}

export const mockVerificationCode = '123456'
