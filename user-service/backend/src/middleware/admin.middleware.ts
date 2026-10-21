import type { RequestHandler } from 'express'
import { UserServiceError } from '../types/user.types.js'

export const adminMiddleware: RequestHandler = (req, _res, next) => {
  if (!req.user || req.user.role !== 'super-admin') {
    next(new UserServiceError('FORBIDDEN', 'Super admin access required.', 403))
    return
  }
  next()
}
