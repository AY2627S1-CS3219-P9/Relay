import type { UserApiError, UserRole } from '@relay/contracts'

/** Claims extracted from a verified mock or Cognito-compatible JWT. */
export type AuthenticatedUser = {
  sub: string
  email: string
  emailVerified: boolean
  role: UserRole
}

/** Profile data owned by the User Service database. */
export type UserProfileRecord = {
  id: string
  cognitoSub: string
  username: string | null
  profilePictureKey: string | null
  createdAt: Date
  updatedAt: Date
}

/** Values accepted when creating or modifying a profile. */
export type ProfileUpdate = {
  username?: string
  profilePictureKey?: string
}

export type UserServiceErrorCode = UserApiError['code']

export class UserServiceError extends Error {
  readonly code: UserServiceErrorCode
  readonly statusCode: number
  readonly fieldErrors?: Record<string, string>

  constructor(
    code: UserServiceErrorCode,
    message: string,
    statusCode = 400,
    fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'UserServiceError'
    this.code = code
    this.statusCode = statusCode
    this.fieldErrors = fieldErrors
  }
}

export type AuthenticatedRequestContext = {
  user: AuthenticatedUser
}
