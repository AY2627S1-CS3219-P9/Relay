import type { 
  NextFunction, 
  Request, 
  RequestHandler, 
  Response 
} from 'express'
import { ErrandErrors } from '@relay/contracts'
import { 
  getEnv 
} from '../config/env.js'
import { 
  ErrandServiceError, 
  type AuthenticatedUser 
} from '../types/errand.types.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

type UserSessionResponse = {
  ok: boolean
  data?: {
    user?: {
      subject: string
      email: string
      emailVerified: boolean
      role: AuthenticatedUser['role']
      profileCreated: boolean
    }
  }
}

export const sessionMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const cookie = req.header('cookie')
  if (!cookie) {
    next(new ErrandServiceError(ErrandErrors.UNAUTHENTICATED, 'Authentication is required.', 401))
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
      next(new ErrandServiceError(ErrandErrors.UNAUTHENTICATED, 'The session is invalid or expired.', 401))
      return
    }

    const body = (await response.json()) as UserSessionResponse
    const user = body.data?.user
    if (!body.ok || !user?.subject || !user.email) {
      next(new ErrandServiceError(ErrandErrors.UNAUTHENTICATED, 'The session response is invalid.', 401))
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
      new ErrandServiceError(
        ErrandErrors.UNAUTHENTICATED,
        error instanceof Error && error.name === 'TimeoutError'
          ? 'User Service authentication timed out.'
          : 'User Service authentication is unavailable.',
        503,
      ),
    )
  }
}

export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new ErrandServiceError(ErrandErrors.UNAUTHENTICATED, 'Authentication is required.', 401)
  }
  return req.user
}
