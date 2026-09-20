/** Opaque identifier for an authenticated session. */
export type SessionId = string & { readonly __brand: 'SessionId' }

export type UserRole = 'admin' | 'user'

/** The only user representation that crosses the User API boundary. */
export type UserProfile = {
  email: string
  username: string | null
  profilePictureUrl: string | null
  emailVerified: boolean
  role: UserRole
}

/** Public session metadata. Passwords and session storage details stay server-side. */
export type Session = {
  sessionId: SessionId
  expiresAt: string
}
