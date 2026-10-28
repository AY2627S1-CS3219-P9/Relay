import type { UserApiErrorCode } from '@relay/contracts/user-auth'
export class AuthError extends Error {
  constructor(public code: UserApiErrorCode, message: string, public status = 400, public fieldErrors?: Record<string,string>) { super(message) }
}
