import type { RequestHandler } from 'express'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export type UserRole = 'super-admin' | 'admin' | 'user'
export type AuthenticatedUser = { sub: string; email: string; emailVerified: boolean; role: UserRole }
export type UserAuthClaims = JWTPayload & { email: string; emailVerified: boolean; role: UserRole }

declare global {
  namespace Express { interface Request { user?: AuthenticatedUser } }
}

let verifier: ReturnType<typeof createRemoteJWKSet> | undefined
function getVerifier() {
  verifier ??= createRemoteJWKSet(new URL(process.env.USER_AUTH_JWKS_URL ?? 'http://user-auth-api:3000/api/auth/.well-known/jwks.json'), { cooldownDuration: 30_000, cacheMaxAge: 300_000, timeoutDuration: 5_000 })
  return verifier
}
export async function verifyUserAccessToken(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, getVerifier(), { issuer: process.env.USER_AUTH_ISSUER ?? 'relay-user-auth', audience: process.env.USER_AUTH_AUDIENCE ?? 'relay-services', algorithms: ['RS256'] })
  if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' ||
      typeof payload.emailVerified !== 'boolean' ||
      (payload.role !== 'user' && payload.role !== 'admin' && payload.role !== 'super-admin')) {
    throw new Error('The access token has invalid identity claims.')
  }
  return { sub: payload.sub, email: payload.email, emailVerified: payload.emailVerified, role: payload.role }
}

export function readAccessToken(cookieHeader: string | undefined): string | undefined {
  const pair = cookieHeader?.split(';').map(part => part.trim()).find(part => part.startsWith('relay_access='))
  return pair?.slice('relay_access='.length)
}

export const userAuthMiddleware: RequestHandler = async (req, res, next) => {
  const token = readAccessToken(req.header('cookie'))
  if (!token) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } })
    return
  }
  try { req.user = await verifyUserAccessToken(token); next() }
  catch { res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'The access token is invalid or expired.' } }) }
}
