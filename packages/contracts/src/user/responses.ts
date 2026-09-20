import type { Session, SessionId, UserProfile } from './models'

export type RegisterResponse = Session & {
  verificationRequired: boolean
}

export type LoginResponse = Session

export type SubmitOtpResponse = Session & {
  requiresProfileSetup: boolean
}

export type IsVerifiedResponse = {
  isVerified: boolean
}

export type GetUserResponse = UserProfile

export type UpdateUserResponse = Pick<
  UserProfile,
  'email' | 'username' | 'profilePictureUrl'
>

export type SessionResponse = {
  sessionId: SessionId
}
