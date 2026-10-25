import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { CreditEstimationErrors } from '@relay/contracts'
import { getEnv } from '../config/env'
import { EstimationServiceError } from '../types/estimation.types'

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export interface AuthenticatedUser {
  sub: string
  email: string
  emailVerified: boolean
  role: 'admin' | 'user'
  profileCreated: boolean
}

export const sessionMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const cookie = req.header('cookie')
  if (!cookie) {
    next(
      new EstimationServiceError(
        CreditEstimationErrors.UNAUTHENTICATED,
        'Authentication is required.',
        401,
      ),
    )
    return
  }

  const env = getEnv()

  try {
    const response = await fetch(`${env.userApiUrl}/internal/user/session/validate`, {
      method: 'POST',
      headers: {
        cookie,
        'x-user-service-token': env.userServiceInternalToken,
      },
      signal: AbortSignal.timeout(env.timeoutMs),
    })

    if (!response.ok) {
      next(
        new EstimationServiceError(
          CreditEstimationErrors.UNAUTHENTICATED,
          'The session is invalid or expired.',
          401,
        ),
      )
      return
    }

    const body = await response.json()
    const user = body.ok ? body.data?.user : undefined
    if (!body.ok || !user?.subject || !user?.email) {
      next(
        new EstimationServiceError(
          CreditEstimationErrors.UNAUTHENTICATED,
          'The session response is invalid.',
          401,
        ),
      )
      return
    }

    req.user = {
      sub: user.subject,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      profileCreated: user.profileCreated,
    }
    next()
  } catch (error) {
    next(
      new EstimationServiceError(
        CreditEstimationErrors.UNAUTHENTICATED,
        error instanceof Error && error.name === 'AbortError'
          ? 'User Service authentication timed out.'
          : 'User Service authentication is unavailable.',
        503,
      ),
    )
  }
}

export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new EstimationServiceError(
      CreditEstimationErrors.UNAUTHENTICATED,
      'Authentication is required.',
      401,
    )
  }
  return req.user
}
