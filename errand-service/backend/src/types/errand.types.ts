import type { ErrandErrorCode, UserRole } from '@relay/contracts'

export type AuthenticatedUser = {
  sub: string
  email: string
  emailVerified: boolean
  role: UserRole
  profileCreated: boolean
}

export class ErrandServiceError extends Error {
  constructor(
    public readonly code: ErrandErrorCode,
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message)
    this.name = 'ErrandServiceError'
  }
}
