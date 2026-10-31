import 'dotenv/config'

export type UserServiceEnv = {
  nodeEnv: string
  port: number
  awsEndpointUrl: string
  awsRegion: string
  authMode: 'mock' | 'cognito'
  cognitoUserPoolId: string
  internalServiceToken: string
  s3Endpoint: string
  s3PublicEndpoint: string
  s3Region: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Bucket: string
  s3ForcePathStyle: boolean
  kafkaBrokers: string[]
  kafkaTopicUserEvents: string
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

  const authMode = process.env.AUTH_MODE ?? 'mock'
  if (authMode !== 'mock' && authMode !== 'cognito') {
    throw new Error('AUTH_MODE must be mock or cognito')
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port,
    awsEndpointUrl: process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566',
    awsRegion: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    authMode,
    cognitoUserPoolId: required('COGNITO_USER_POOL_ID', 'us-east-1_test'),
    internalServiceToken: required(
      'INTERNAL_USER_SERVICE_TOKEN',
      'local-internal-user-service-token',
    ),
    s3Endpoint: required('S3_ENDPOINT', 'http://localhost:4566'),
    s3PublicEndpoint: required(
      'S3_PUBLIC_ENDPOINT',
      process.env.S3_ENDPOINT ?? 'http://localhost:4566',
    ),
    s3Region: required('S3_REGION', 'us-east-1'),
    s3AccessKeyId: required('S3_ACCESS_KEY_ID', 'test'),
    s3SecretAccessKey: required('S3_SECRET_ACCESS_KEY', 'test'),
    s3Bucket: required('S3_BUCKET', 'relay-user-profile-images'),
    s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    kafkaBrokers: required('KAFKA_BROKERS', 'kafka:9092').split(','),
    kafkaTopicUserEvents: required('KAFKA_TOPIC_USER_EVENTS'),
  }
}
