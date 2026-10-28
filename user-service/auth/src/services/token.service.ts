import { readFile } from 'node:fs/promises'
import { createPublicKey } from 'node:crypto'
import { exportJWK, importPKCS8, jwtVerify, SignJWT, type JWK } from 'jose'
import { getEnv } from '../config/env.js'
import type { AuthenticatedUser } from '@relay/user-auth-jwt-verify'

const env = getEnv()
let keys: Promise<{ privateKey: CryptoKey; publicJwk: JWK }> | undefined
async function loadKeys() {
  keys ??= (async () => {
    const pem = await readFile(env.privateKeyFile, 'utf8')
    const privateKey = await importPKCS8(pem, 'RS256')
    const publicKey = createPublicKey(pem)
    const publicJwk = await exportJWK(publicKey)
    return { privateKey, publicJwk: { ...publicJwk, kid: env.jwtKid, use: 'sig', alg: 'RS256' } }
  })()
  return keys
}
export async function jwks() { return { keys: [(await loadKeys()).publicJwk] } }
export async function issue(user: AuthenticatedUser) {
  const { privateKey } = await loadKeys()
  return new SignJWT({ email: user.email, emailVerified: user.emailVerified, role: user.role })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: env.jwtKid })
    .setIssuer(env.jwtIssuer).setAudience(env.jwtAudience).setSubject(user.sub)
    .setIssuedAt().setExpirationTime('15m').sign(privateKey)
}
export async function verifyLocal(token: string): Promise<AuthenticatedUser> {
  const { publicJwk } = await loadKeys()
  const { importJWK } = await import('jose')
  const key = await importJWK(publicJwk, 'RS256')
  const { payload } = await jwtVerify(token, key, { issuer: env.jwtIssuer, audience: env.jwtAudience, algorithms: ['RS256'] })
  if (!payload.sub || typeof payload.email !== 'string' || typeof payload.emailVerified !== 'boolean' || !['user','admin','super-admin'].includes(String(payload.role))) throw new Error('Invalid access token claims')
  return { sub: payload.sub, email: payload.email, emailVerified: payload.emailVerified, role: payload.role as AuthenticatedUser['role'] }
}
