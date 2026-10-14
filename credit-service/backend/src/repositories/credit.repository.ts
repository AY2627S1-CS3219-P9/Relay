import { PrismaClient } from '@prisma/client'
import type {
  AllocateInitialCreditCommand,
  CreditBalance,
  TransactionRecord,
} from '@relay/contracts'
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

  async allocateInitialCredit(command: AllocateInitialCreditCommand): Promise<void> {
    const reference = `${command.transactionReference.service}:${command.transactionReference.id}:${command.transactionReference.type}`
    if (
      command.transactionReference.type !== 'INITIAL_ALLOCATION' ||
      command.userId !== command.transactionReference.id
    ) {
      throw new Error('Invalid initial credit allocation command.')
    }
    try {
      await prisma.$transaction(async (tx) => {
        if (await tx.transactionRecord.findUnique({ where: { reference } })) return
        await tx.creditBalance.create({
          data: { userId: command.userId, availableCredit: 100, reserveCredit: 0 },
        })
        await tx.transactionRecord.create({
          data: {
            reference,
            senderId: 'SYSTEM',
            receiverId: command.userId,
            type: 'INITIAL_ALLOCATION',
            amount: 100,
          },
        })
      })
    } catch (error) {
      // A retry or concurrent consumer may win the unique-key race.
      if (
        (error as { code?: string }).code === 'P2002' &&
        (await prisma.transactionRecord.findUnique({ where: { reference } }))
      )
        return
      throw error
    }
  }

  async checkTables(): Promise<void> {
    await prisma.$transaction([
      prisma.creditBalance.findFirst(),
      prisma.transactionRecord.findFirst(),
    ])
  }
}
