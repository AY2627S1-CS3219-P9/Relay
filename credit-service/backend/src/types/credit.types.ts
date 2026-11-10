// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT-5.6 Luna), date: 2026-10-14
// Scope: Generated initial implementation, debugged implementation
// Author review: I validated correctness and edited for style.

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
