import type { Session } from '..'
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

export type SendOtpRequest = {
  email: string
}

export type SubmitOtpAndLoginRequest = LoginRequest & {
  code: string
}

export type UpdateUserRequest = {
  session: Session
  username?: string
  profilePicture?: ImageDataUrl
}

export type ChangePasswordRequest = {
  session: Session
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}
