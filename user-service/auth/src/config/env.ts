import 'dotenv/config'
export type AuthEnv = { port: number; region: string; endpoint: string; issuer: string; jwksUri: string; clientId: string; poolId: string; adminGroup: string; superGroup: string; privateKeyFile: string; jwtIssuer: string; jwtAudience: string; jwtKid: string; cookieSecure: boolean }
export function getEnv(): AuthEnv {
  const port = Number(process.env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  return { port, region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1', endpoint: process.env.AWS_ENDPOINT_URL ?? 'http://floci:4566', issuer: process.env.COGNITO_ISSUER ?? 'http://localhost:4566/us-east-1_test', jwksUri: process.env.COGNITO_JWKS_URI ?? 'http://floci:4566/us-east-1_test/.well-known/jwks.json', clientId: process.env.COGNITO_CLIENT_ID ?? 'test', poolId: process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_test', adminGroup: process.env.COGNITO_ADMIN_GROUP_NAME ?? 'AdminGroup', superGroup: process.env.COGNITO_SUPERADMIN_GROUP_NAME ?? 'SuperAdminGroup', privateKeyFile: process.env.JWT_PRIVATE_KEY_FILE ?? '/var/lib/user-auth/private.pem', jwtIssuer: process.env.USER_AUTH_ISSUER ?? 'relay-user-auth', jwtAudience: process.env.USER_AUTH_AUDIENCE ?? 'relay-services', jwtKid: process.env.USER_AUTH_KEY_ID ?? 'relay-auth-v1', cookieSecure: (process.env.COOKIE_SECURE ?? 'true') === 'true' }
}
