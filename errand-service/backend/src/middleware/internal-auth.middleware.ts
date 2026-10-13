import type { RequestHandler } from 'express'
import { getEnv } from '../config/env.js'
import { ErrandErrors } from '@relay/contracts'
import { ErrandServiceError } from '../types/errand.types.js'

/** Authenticates backend-to-backend calls made to the Errand Service. */
export const internalServiceAuth: RequestHandler = (req, _res, next) => {
  if (req.header('x-errand-service-token') !== getEnv().internalServiceToken) {
    next(
      new ErrandServiceError(
        ErrandErrors.UNAUTHENTICATED,
        'Invalid service credentials.',
        401,
      ),
    )
    return
  }

  next()
}
