import type { RequestHandler } from 'express'
import { UserSessionService } from '../services/user-session.service.js'
import { CreditServiceError } from '../types/credit.types.js'

export function createSessionMiddleware(service: UserSessionService): RequestHandler {
  return async (req, res, next) => {
    try {
      res.locals.creditUserId = await service.validate(req.header('cookie') ?? '')
      next()
    } catch (error) {
      if (error instanceof CreditServiceError) {
        next(error)
        return
      }
      console.error('Credit session validation unavailable:', error)
      res.status(503).json({ message: 'The authentication service is unavailable.' })
    }
  }
}
