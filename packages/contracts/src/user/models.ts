/** A validated base64 data URL for a supported profile image. */
export type ImageDataUrl = string & { readonly __brand: 'ImageDataUrl' }

export type UserId = string & { readonly __brand: 'UserId' }

export type UserRole = 'admin' | 'user'

/** The only user representation that crosses the User API boundary. */
export type User = {
  id: UserId
  email: string
  username: string | null
  profilePictureUrl: string | null
  emailVerified: boolean
  profileCreated: boolean
  role: UserRole
}