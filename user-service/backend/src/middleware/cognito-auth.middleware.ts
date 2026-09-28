import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { createPublicKey } from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getEnv } from '../config/env.js'
import { UserServiceError, type AuthenticatedUser } from '../types/user.types.js'

type CognitoLikeClaims = JwtPayload & {
  sub: string
  email?: string
  username?: string
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
    throw new UserServiceError('UNAUTHENTICATED', 'The token does not contain a valid subject.', 401)
  }

  const email = claims.email ?? claims.username
  if (!email || typeof email !== 'string') {
    throw new UserServiceError('UNAUTHENTICATED', 'The token does not contain an email.', 401)
  }

  const groups = claims['cognito:groups'] ?? []
  const isAdmin = groups.includes(getEnv().cognitoAdminGroupName)
  return {
    sub: claims.sub,
    email,
    emailVerified: claims.email_verified === true,
    role: isAdmin ? 'admin' : 'user',
  }
}

type Jwk = { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }
let jwksCache: { keys: Jwk[]; expiresAt: number } | undefined

async function getCognitoKey(kid: string): Promise<string> {
  const env = getEnv()
  if (!jwksCache || jwksCache.expiresAt <= Date.now()) {
    const response = await fetch(env.cognitoJwksUri)
    if (!response.ok) throw new Error(`Unable to load Cognito signing keys (${response.status}).`)
    const body = (await response.json()) as { keys?: Jwk[] }
    jwksCache = { keys: body.keys ?? [], expiresAt: Date.now() + 60 * 60 * 1000 }
  }
  let key = jwksCache.keys.find((candidate) => candidate.kid === kid)
  if (!key) {
    jwksCache = undefined
    return getCognitoKey(kid)
  }
  return createPublicKey({ key, format: 'jwk' }).export({ format: 'pem', type: 'spki' }).toString()
}

async function verifyCognitoJwt(token: string): Promise<AuthenticatedUser> {
  const env = getEnv()
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || typeof decoded === 'string' || typeof decoded.header.kid !== 'string') {
    throw new Error('The Cognito token header is invalid.')
  }
  const key = await getCognitoKey(decoded.header.kid)
  const claims = jwt.verify(token, key, {
    algorithms: ['RS256'],
    issuer: env.cognitoIssuer,
  })
  if (typeof claims === 'string') throw new Error('The Cognito token payload is invalid.')
  const cognitoClaims = claims as CognitoLikeClaims & { token_use?: string; client_id?: string }
  if (cognitoClaims.token_use !== 'access') throw new Error('An access token is required.')
  if (cognitoClaims.client_id !== env.cognitoClientId) throw new Error('The Cognito client is invalid.')
  if (cognitoClaims.email_verified === true && typeof cognitoClaims.email === 'string') {
    return claimsToUser(cognitoClaims)
  }

  const cognito = new CognitoIdentityProviderClient({
    region: env.awsRegion,
    endpoint: env.awsEndpointUrl,
  })
  const result = await cognito.send(new GetUserCommand({ AccessToken: token }))
  const attributes = new Map((result.UserAttributes ?? []).map((attribute) => [attribute.Name, attribute.Value]))
  const enrichedClaims = {
    ...cognitoClaims,
    email: attributes.get('email') ?? cognitoClaims.email ?? cognitoClaims.username,
    email_verified: attributes.get('email_verified') === 'true',
  }
  return claimsToUser(enrichedClaims)
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
    throw new UserServiceError('UNAUTHENTICATED', 'The token payload is invalid.', 401)
  }

  return claimsToUser(decoded as CognitoLikeClaims)
}

export const cognitoAuthMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    res.status(401).json({ code: 'UNAUTHENTICATED', message: 'A bearer token is required.' })
    return
  }

  try {
    req.user = getEnv().authMode === 'cognito' ? await verifyCognitoJwt(token) : verifyMockJwt(token)
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The bearer token is invalid.'
    res.status(401).json({ code: 'SESSION_EXPIRED', message })
  }
}

export function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UserServiceError('UNAUTHENTICATED', 'Authentication is required.', 401)
  }
  return req.user
}

export function requireBearerToken(req: Request): string {
  const token = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new UserServiceError('UNAUTHENTICATED', 'A bearer token is required.', 401)
  return token
}
