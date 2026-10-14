import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  USER_API_URL: z.string().url().default('http://user-api:3000'),
  USER_API_TIMEOUT: z.coerce.number().int().positive().default(5000),
  USER_SERVICE_INTERNAL_TOKEN: z.string().min(1).default('local-internal-user-service-token'),
  KAFKA_BROKERS: z.string().min(1).default('kafka:9092'),
  KAFKA_TOPIC_USER_REGISTERED: z.string().min(1),
  KAFKA_TOPIC_USER_DELETED: z.string().min(1),
  KAFKA_TOPIC_ERRAND_CONFIRMED: z.string().min(1),
  KAFKA_TOPIC_ERRAND_CANCELLED: z.string().min(1),
  KAFKA_TOPIC_ERRAND_EXPIRED: z.string().min(1),
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
    kafkaTopics: {
      userRegistered: env.KAFKA_TOPIC_USER_REGISTERED,
      userDeleted: env.KAFKA_TOPIC_USER_DELETED,
      errandConfirmed: env.KAFKA_TOPIC_ERRAND_CONFIRMED,
      errandCancelled: env.KAFKA_TOPIC_ERRAND_CANCELLED,
      errandExpired: env.KAFKA_TOPIC_ERRAND_EXPIRED,
    },
  }
}
