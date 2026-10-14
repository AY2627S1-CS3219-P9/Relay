import 'dotenv/config'
import { z } from 'zod'
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
})
export function getEnv() {
  const env = schema.parse(process.env)
  return { databaseUrl: env.DATABASE_URL, port: env.PORT }
}
