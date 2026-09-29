import type { RequestHandler } from 'express'
import { getEnv } from '../config/env.js'

export const internalServiceAuth: RequestHandler = (req, res, next) => {
  if (req.header('x-user-service-token') !== getEnv().internalServiceToken) {
    res
      .status(401)
      .json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Invalid service credentials.' },
      })
    return
  }
  next()
}
