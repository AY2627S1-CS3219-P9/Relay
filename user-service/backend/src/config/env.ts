import 'dotenv/config'

export type UserServiceEnv = {
  nodeEnv: string
  port: number
  mockJwtSecret: string
  mockJwtIssuer: string
  mockJwtAudience: string
  s3Endpoint: string
  s3Region: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Bucket: string
  s3ForcePathStyle: boolean
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function getEnv(): UserServiceEnv {
  const port = Number(process.env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port,
    mockJwtSecret: required('MOCK_JWT_SECRET', 'local-development-only-secret'),
    mockJwtIssuer: required('MOCK_JWT_ISSUER', 'relay-user-service'),
    mockJwtAudience: required('MOCK_JWT_AUDIENCE', 'relay-user-frontend'),
    s3Endpoint: required('S3_ENDPOINT', 'http://localhost:4566'),
    s3Region: required('S3_REGION', 'us-east-1'),
    s3AccessKeyId: required('S3_ACCESS_KEY_ID', 'test'),
    s3SecretAccessKey: required('S3_SECRET_ACCESS_KEY', 'test'),
    s3Bucket: required('S3_BUCKET', 'relay-user-profile-images'),
    s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  }
}
