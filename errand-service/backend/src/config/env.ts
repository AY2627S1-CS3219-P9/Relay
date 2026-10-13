import 'dotenv/config'

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type ErrandEnv = {
  nodeEnv: string
  port: number
  databaseUrl: string
  userApiUrl: string
  userServiceInternalToken: string
  internalServiceToken: string
  timeoutMs: number
}

export function getEnv(): ErrandEnv {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: positiveInteger(process.env.PORT, 3000),
    databaseUrl,
    userApiUrl: process.env.USER_API_URL ?? 'http://user-api:3000',
    userServiceInternalToken:
      process.env.USER_SERVICE_INTERNAL_TOKEN ?? 'local-internal-user-service-token',
    internalServiceToken:
      process.env.INTERNAL_ERRAND_SERVICE_TOKEN ?? 'local-internal-errand-service-token',
    timeoutMs: positiveInteger(process.env.ERRAND_SERVICE_TIMEOUT_MS, 5000),
  }
}
