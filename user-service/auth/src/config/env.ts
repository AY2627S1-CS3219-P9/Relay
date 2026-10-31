import 'dotenv/config'

export type AuthEnv = {
  port: number
  region: string
  endpoint: string
  clientId: string
  poolId: string
  adminGroup: string
  superGroup: string
  cookieSecure: boolean
}

export function getEnv(): AuthEnv {
  const port = Number(process.env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  return {
    port,
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL ?? 'http://floci:4566',
    clientId: process.env.COGNITO_CLIENT_ID ?? 'test',
    poolId: process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_test',
    adminGroup: process.env.COGNITO_ADMIN_GROUP_NAME ?? 'AdminGroup',
    superGroup: process.env.COGNITO_SUPERADMIN_GROUP_NAME ?? 'SuperAdminGroup',
    cookieSecure: (process.env.COOKIE_SECURE ?? 'true') === 'true',
  }
}
