import type { CreditErrorCode } from '@relay/contracts'

export class CreditServiceError extends Error {
  constructor(
    readonly code: CreditErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
    this.name = 'CreditServiceError'
  }
}
