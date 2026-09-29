import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { getEnv } from '../config/env.js'
import { SessionRepository, type StoredSession } from '../repositories/session.repository.js'
import type { AuthenticatedUser } from '../types/user.types.js'
import { UserServiceError } from '../types/user.types.js'
import { createHash } from 'node:crypto'

declare global {
  namespace Express {
    interface Request {
      session?: StoredSession
      accessToken?: string
      user?: AuthenticatedUser
    }
  }
}

const sessions = new SessionRepository()

export function readSessionCookie(req: Request): string | undefined {
  const cookieHeader = req.header('cookie')
  const name = `${getEnv().sessionCookieName}=`
  return cookieHeader
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(name))
    ?.slice(name.length)
}

export const sessionMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const cookie = readSessionCookie(req)
  if (!cookie) {
    res
      .status(401)
      .json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
      })
    return
  }
  try {
    const session = await sessions.findActiveByTokenHash(
      createHash('sha256').update(cookie).digest('hex'),
    )
    if (!session)
      throw new UserServiceError('UNAUTHENTICATED', 'The session is invalid or expired.', 401)
    req.session = session
    req.accessToken = session.cognitoAccessToken
    req.user = {
      sub: session.cognitoSub,
      email: session.email,
      emailVerified: session.emailVerified,
      role: session.role,
    }
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The session is invalid.'
    res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message } })
  }
}

export function requireSession(req: Request): StoredSession {
  if (!req.session)
    throw new UserServiceError('UNAUTHENTICATED', 'Authentication is required.', 401)
  return req.session
}
