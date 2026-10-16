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
  supplierApiUrl: string
  userServiceInternalToken: string
  internalServiceToken: string
  timeoutMs: number
  kafkaBrokers: string
  kafkaGroupId: string
  kafkaTopicErrandEvents: string
}

export function getEnv(): ErrandEnv {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: positiveInteger(process.env.PORT, 3000),
    databaseUrl,
    userApiUrl: process.env.USER_API_URL ?? 'http://user-api:3000',
    supplierApiUrl: process.env.SUPPLIER_API_URL ?? 'http://supplier-api:3000',
    userServiceInternalToken:
      process.env.USER_SERVICE_INTERNAL_TOKEN ?? 'local-internal-user-service-token',
    internalServiceToken:
      process.env.INTERNAL_ERRAND_SERVICE_TOKEN ?? 'local-internal-errand-service-token',
    timeoutMs: positiveInteger(process.env.ERRAND_SERVICE_TIMEOUT_MS, 5000),
    kafkaBrokers: process.env.KAFKA_BROKERS ?? 'localhost:9092',
    kafkaTopicErrandEvents: process.env.KAFKA_TOPIC_ERRAND_EVENTS ?? 'errand-events',
    kafkaGroupId: process.env.KAFKA_GROUP_ID ?? 'errand-service',
  }
}
