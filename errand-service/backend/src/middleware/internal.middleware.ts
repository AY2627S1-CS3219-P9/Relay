import type { NextFunction, Request, Response } from 'express'
import { getEnv } from '../config/env.js'
import { SupplierEventErrors } from '@relay/contracts'

export function internalServiceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.header('x-errand-service-token')
  const env = getEnv()

  if (!token || token !== env.errandServiceInternalToken) {
    res.status(401).json({
      code: SupplierEventErrors.UNAUTHENTICATED,
      message: 'Invalid service token',
    })
    return
  }

  next()
}
