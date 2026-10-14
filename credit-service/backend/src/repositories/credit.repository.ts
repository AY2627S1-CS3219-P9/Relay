import { PrismaClient } from '@prisma/client'
import type { CreditBalance, TransactionRecord } from '@relay/contracts'
import { getEnv } from '../config/env.js'

export const prisma = new PrismaClient({
  datasources: { db: { url: getEnv().databaseUrl } },
})

export class CreditRepository {
  async findBalance(userId: string): Promise<CreditBalance | null> {
    const balance = await prisma.creditBalance.findUnique({ where: { userId } })
    return balance
      ? {
          userId: balance.userId,
          availableCredit: balance.availableCredit.toNumber(),
          reserveCredit: balance.reserveCredit.toNumber(),
          lastUpdated: balance.lastUpdated,
        }
      : null
  }

  async findHistory(userId: string): Promise<TransactionRecord[]> {
    const records = await prisma.transactionRecord.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: [{ time: 'desc' }, { reference: 'asc' }],
    })
    return records.map((record: any) => {
      const [service, id] = record.reference.split(':')
      return {
        reference: { service, id, type: record.type },
        time: record.time,
        senderId: record.senderId,
        receiverId: record.receiverId,
        type: record.type,
        amount: record.amount.toNumber(),
      }
    })
  }

  async checkTables(): Promise<void> {
    await prisma.$transaction([
      prisma.creditBalance.findFirst(),
      prisma.transactionRecord.findFirst(),
    ])
  }
}
