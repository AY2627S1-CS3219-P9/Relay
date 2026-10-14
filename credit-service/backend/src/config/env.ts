import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  USER_API_URL: z.string().url().default('http://user-api:3000'),
  USER_API_TIMEOUT: z.coerce.number().int().positive().default(5000),
  USER_SERVICE_INTERNAL_TOKEN: z.string().min(1).default('local-internal-user-service-token'),
  KAFKA_BROKERS: z.string().min(1).default('kafka:9092'),
  KAFKA_GROUP_ID: z.string().min(1).default('relay-credit-initial-allocation'),
})

export function getEnv() {
  const env = schema.parse(process.env)
  return {
    databaseUrl: env.DATABASE_URL,
    port: env.PORT,
    userApiUrl: env.USER_API_URL.replace(/\/$/, ''),
    userApiTimeout: env.USER_API_TIMEOUT,
    userServiceInternalToken: env.USER_SERVICE_INTERNAL_TOKEN,
    kafkaBrokers: env.KAFKA_BROKERS.split(','),
    kafkaGroupId: env.KAFKA_GROUP_ID,
  }
}
