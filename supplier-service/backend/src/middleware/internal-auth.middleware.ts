import type { RequestHandler } from 'express'
import { getEnv } from '../config/env.js'
import { SupplierErrors } from '@relay/contracts/supplier'
import { SupplierServiceError } from '../types/supplier.types.js'

export const internalServiceAuth: RequestHandler = (req, _res, next) => {
  if (req.header('x-supplier-service-token') !== getEnv().internalServiceToken) {
    next(new SupplierServiceError(SupplierErrors.UNAUTHORIZED, 'Invalid service credentials.', 401))
    return
  }

  next()
}
