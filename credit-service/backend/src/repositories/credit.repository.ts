import { PrismaClient } from '@prisma/client'
import { getEnv } from '../config/env.js'
export const prisma = new PrismaClient({
  datasources: { db: { url: getEnv().databaseUrl } },
})
export class CreditRepository {
  async checkTables(): Promise<void> {
    // Query every model column to detect missing tables or stale schemas.
    await prisma.$transaction([
      prisma.creditBalance.findFirst(),
      prisma.transactionRecord.findFirst(),
    ])
  }
}
