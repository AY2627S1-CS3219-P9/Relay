import type { NextFunction, Request, RequestHandler, Response } from 'express'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import { UserServiceError, type AuthenticatedUser } from '../types/user.types.js'

type CognitoLikeClaims = JwtPayload & {
  sub: string
  email?: string
  email_verified?: boolean
  'cognito:groups'?: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

function claimsToUser(claims: CognitoLikeClaims): AuthenticatedUser {
  if (!claims.sub || typeof claims.sub !== 'string') {
    throw new UserServiceError('INVALID_REQUEST', 'The token does not contain a valid subject.', 401)
  }

  if (!claims.email || typeof claims.email !== 'string') {
    throw new UserServiceError('INVALID_REQUEST', 'The token does not contain an email.', 401)
  }

  const groups = claims['cognito:groups'] ?? []
  return {
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    role: groups.includes('admin') ? 'admin' : 'user',
  }
}

export function generateMockJwt(user: {
  sub: string
  email: string
  emailVerified?: boolean
  role?: 'admin' | 'user'
  expiresIn?: SignOptions['expiresIn']
}): string {
  const env = getEnv()
  return jwt.sign(
    {
      sub: user.sub,
      email: user.email,
      email_verified: user.emailVerified ?? true,
      'cognito:groups': [user.role ?? 'user'],
      token_use: 'access',
    },
    env.mockJwtSecret,
    {
      algorithm: 'HS256',
      issuer: env.mockJwtIssuer,
      audience: env.mockJwtAudience,
      expiresIn: user.expiresIn ?? '30m',
    },
  )
}

export function verifyMockJwt(token: string): AuthenticatedUser {
  const env = getEnv()
  const decoded = jwt.verify(token, env.mockJwtSecret, {
    algorithms: ['HS256'],
    issuer: env.mockJwtIssuer,
    audience: env.mockJwtAudience,
  })

  if (typeof decoded === 'string') {
    throw new UserServiceError('INVALID_REQUEST', 'The token payload is invalid.', 401)
  }

  return claimsToUser(decoded as CognitoLikeClaims)
}

export const cognitoAuthMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    res.status(401).json({ code: 'SESSION_EXPIRED', message: 'A bearer token is required.' })
    return
  }

  try {
    req.user = verifyMockJwt(token)
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The bearer token is invalid.'
    res.status(401).json({ code: 'SESSION_EXPIRED', message })
  }
}

export function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UserServiceError('SESSION_EXPIRED', 'Authentication is required.', 401)
  }
  return req.user
}
