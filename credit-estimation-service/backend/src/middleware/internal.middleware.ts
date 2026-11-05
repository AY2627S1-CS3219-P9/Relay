import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { getEnv } from '../config/env'

export function internalServiceAuth(req: Request, res: Response, next: NextFunction) {
  const env = getEnv()
  const token = req.header('x-credit-estimation-service-token') || req.header('x-service-token')

  if (!token || token !== env.internalServiceToken) {
    res.status(401).json({
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
    })
    return
  }

  next()
}
