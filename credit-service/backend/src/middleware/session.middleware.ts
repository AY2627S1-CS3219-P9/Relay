// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT-5.6 Luna), date: 2026-10-14
// Scope: Generated initial implementation, debugged implementation
// Author review: I validated correctness and edited for style.

import type { RequestHandler } from 'express'
import { userAuthMiddleware } from '@relay/user-auth-backend-middleware'
import { CreditServiceError } from '../types/credit.types.js'
const requireVerifiedEmail: RequestHandler = (req, res, next) => {
  if (!req.user?.emailVerified) {
    next(new CreditServiceError('FORBIDDEN', 'A verified email is required.', 403))
    return
  }
  res.locals.creditUserId = req.user.sub
  next()
}
export const creditAuthMiddleware = [userAuthMiddleware, requireVerifiedEmail]
