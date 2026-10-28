import type { RequestHandler } from 'express'
import { userAuthMiddleware } from '@relay/user-auth-middleware'
import { CreditServiceError } from '../types/credit.types.js'
const requireVerifiedEmail: RequestHandler = (req,res,next) => {
  if (!req.user?.emailVerified) { next(new CreditServiceError('FORBIDDEN','A verified email is required.',403)); return }
  res.locals.creditUserId=req.user.sub
  next()
}
export const creditAuthMiddleware = [userAuthMiddleware,requireVerifiedEmail]
