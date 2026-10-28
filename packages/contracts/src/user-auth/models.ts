export type UserRole = 'super-admin' | 'admin' | 'user'
/** Registered JWT claims plus Relay identity claims. NumericDate values use seconds. */
export type JwtAccessTokenClaims = {
  iss: string
  sub: string
  aud: string | string[]
  exp: number
  iat: number
  nbf?: number
  jti?: string
  email: string
  emailVerified: boolean
  role: UserRole
}
/** Compact signed JWT transported as a bearer access token. */
export type JwtAccessToken = string & { readonly __brand: 'JwtAccessToken' }

/** Public RS256 verification keys served at /api/auth/.well-known/jwks.json. */
export type UserAuthJwks = { keys: Array<{ kty: 'RSA'; kid: string; use: 'sig'; alg: 'RS256'; n: string; e: string }> }
