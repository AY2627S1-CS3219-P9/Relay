import type { Request, Response } from 'express'
import { CreditServiceError } from '../types/credit.types.js'

export function authenticatedUserId(req: Request, res: Response): string {
  const subject = res.locals.creditUserId as string
  const requested = req.query.userId
  if (requested !== undefined) {
    if (typeof requested !== 'string' || !requested.trim()) {
      throw new CreditServiceError('INVALID_REQUEST', 'userId must be a non-empty string.', 400)
    }
    if (requested !== subject) {
      throw new CreditServiceError('FORBIDDEN', 'You can only view your own credits.', 403)
    }
  }
  return subject
}
