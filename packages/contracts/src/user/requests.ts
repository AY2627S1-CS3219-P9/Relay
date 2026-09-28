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
  username?: string
  profilePicture?: ImageDataUrl
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

export type CheckAuthRequest = {
  sessionToken: string
}
