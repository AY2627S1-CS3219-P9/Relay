import type { ImageDataUrl } from './models'

export type RegisterRequest = {
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type ResendVerificationRequest = {
  email: string
}

export type SubmitOtpAndLoginRequest = LoginRequest & {
  code: string
}

/**
 * Omit a field to leave it unchanged. Set `profilePicture` to null to remove
 * the existing picture.
 */
export type UpdateUserRequest = {
  username?: string
  profilePicture?: ImageDataUrl | null
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

export type DeleteUserRequest = {
  confirmation: string
}
