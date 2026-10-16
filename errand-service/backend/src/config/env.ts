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
  supplierServiceToken: string
  supplierTimeoutMs: number
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
    supplierServiceToken:
      process.env.INTERNAL_SUPPLIER_SERVICE_TOKEN ?? 'local-internal-supplier-service-token',
    supplierTimeoutMs: positiveInteger(process.env.SUPPLIER_SERVICE_TIMEOUT_MS, 5000),
    internalServiceToken:
      process.env.INTERNAL_ERRAND_SERVICE_TOKEN ?? 'local-internal-errand-service-token',
    timeoutMs: positiveInteger(process.env.ERRAND_SERVICE_TIMEOUT_MS, 5000),
    // Local Node processes use Kafka's host-published listener; Compose uses
    // KAFKA_BROKERS=kafka:9092 for the internal listener.
    kafkaBrokers: process.env.KAFKA_BROKERS ?? 'localhost:29092',
    kafkaTopicErrandEvents: process.env.KAFKA_TOPIC_ERRAND_EVENTS ?? 'errand-events',
    kafkaGroupId: process.env.KAFKA_GROUP_ID ?? 'errand-service',
  }
}
