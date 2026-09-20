import type { SessionId } from './models'

export type RegisterRequest = {
  email: string
  password: string
  passwordConfirmation: string
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
  profilePicture?: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}
