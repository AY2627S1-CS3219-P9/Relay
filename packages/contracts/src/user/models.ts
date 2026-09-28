/** A validated base64 data URL for a supported profile image. */
export type ImageDataUrl = string & { readonly __brand: 'ImageDataUrl' }

export type UserId = string & { readonly __brand: 'UserId' }

export type UserRole = 'admin' | 'user'

/**
 * Identity available from an authenticated User Service session.
 *
 * A session can exist before a user creates a Relay profile. In that case,
 * `profileCreated` is false and `getUser()` returns `PROFILE_NOT_FOUND`.
 */
export type SessionUser = {
  subject: string
  email: string
  emailVerified: boolean
  role: UserRole
  profileCreated: boolean
}

/** The authenticated state returned by the User Service. */
export type Session = {
  user: SessionUser
}

/**
 * A complete Relay profile. `getUser()` and `updateUser()` always return this
 * exact shape; partial profile responses are not permitted.
 */
export type User = {
  id: UserId
  email: string
  username: string | null
  profilePictureUrl: string | null
  emailVerified: boolean
  profileCreated: true
  role: UserRole
}
