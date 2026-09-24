import type { ImageDataUrl, SessionId, UserRole } from './models'

export type RegisterRequest = {
  email: string
  password: string
  passwordConfirmation: string
  role?: UserRole
}

export type LoginRequest = {
  email: string
  password: string
}

export type SubmitOtpRequest = {
  sessionId: SessionId
  otp: string
}

export type UpdateUserRequest = {
  username?: string
  profilePicture?: ImageDataUrl
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}
