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
