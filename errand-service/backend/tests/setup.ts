import { config } from 'dotenv'

config({ path: '.env.test' })

// Set default DATABASE_URL if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://relay:relay@localhost:5434/relay_errand?schema=public'
}
