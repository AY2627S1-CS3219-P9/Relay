import { PrismaClient, Prisma } from '@relay/credit-prisma'
import type {
  AllocateInitialCreditCommand,
  CreditBalance,
  DeleteUserCreditCommand,
  ReleaseCreditCommand,
  ReserveCreditRequest,
  ReserveCreditResponse,
  TransactionRecord,
  TransferCreditCommand,
} from '@relay/contracts'
import { getEnv } from '../config/env.js'
import { CreditServiceError } from '../types/credit.types.js'

export const prisma = new PrismaClient({
  datasources: { db: { url: getEnv().databaseUrl } },
})

function referenceOf(command: {
  transactionReference: { service: string; id: string; type: string }
}): string {
  const { service, id, type } = command.transactionReference
  if (!service || !id || service.includes(':') || id.includes(':')) {
    throw new Error('Invalid transaction reference.')
  }
  return `${service}:${id}:${type}`
}

function positiveAmount(amount: number): Prisma.Decimal {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Credit amount must be positive.')
  return new Prisma.Decimal(amount)
}

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
      orderBy: [{ time: 'desc' }],
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

  async findReservation(errandId: string): Promise<{ userId: string; amount: number } | null> {
    const record = await prisma.transactionRecord.findUnique({
      where: { reference: `errand:${errandId}:CREDIT_RESERVE` },
    })
    return record ? { userId: record.senderId, amount: record.amount.toNumber() } : null
  }

  async allocateInitialCredit(command: AllocateInitialCreditCommand): Promise<void> {
    const reference = referenceOf(command)
    if (
      command.transactionReference.type !== 'INITIAL_ALLOCATION' ||
      command.transactionReference.service !== 'user' ||
      command.userId !== command.transactionReference.id
    )
      throw new Error('Invalid initial credit allocation command.')
    try {
      await prisma.$transaction(async (tx: any) => {
        if (await tx.transactionRecord.findUnique({ where: { reference } })) return
        // A delayed registration event must never recreate a deleted user's balance.
        if (
          await tx.transactionRecord.findUnique({
            where: { reference: `user:${command.userId}:USER_DELETION` },
          })
        )
          return
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
      if (
        (error as { code?: string }).code === 'P2002' &&
        (await prisma.transactionRecord.findUnique({ where: { reference } }))
      )
        return
      throw error
    }
  }

  async reserveCredit(request: ReserveCreditRequest): Promise<ReserveCreditResponse> {
    const reference = referenceOf(request)
    if (
      request.transactionReference.service !== 'errand' ||
      request.transactionReference.type !== 'CREDIT_RESERVE' ||
      !request.userId
    )
      throw new CreditServiceError('INVALID_REQUEST', 'Invalid credit reservation reference.', 400)
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new CreditServiceError(
        'INVALID_CREDIT_AMOUNT',
        'Credit amount must be a positive number.',
        422,
      )
    }
    const amount = new Prisma.Decimal(request.amount)

    const existingResponse = async (): Promise<ReserveCreditResponse | null> => {
      const record = await prisma.transactionRecord.findUnique({ where: { reference } })
      if (!record) return null
      if (
        record.senderId !== request.userId ||
        record.receiverId !== request.userId ||
        !record.amount.equals(amount)
      )
        throw new CreditServiceError(
          'INVALID_REQUEST',
          'Reservation reference was already used for different details.',
          400,
        )
      const balance = await this.findBalance(request.userId)
      if (!balance)
        throw new CreditServiceError(
          'USER_NOT_FOUND',
          'The user has no credit balance record.',
          404,
        )
      return { ...balance, status: 'ALREADY_RESERVED' }
    }

    try {
      return await prisma.$transaction(async (tx: any) => {
        const prior = await tx.transactionRecord.findUnique({ where: { reference } })
        if (prior) {
          if (
            prior.senderId !== request.userId ||
            prior.receiverId !== request.userId ||
            !prior.amount.equals(amount)
          )
            throw new CreditServiceError(
              'INVALID_REQUEST',
              'Reservation reference was already used for different details.',
              400,
            )
          const balance = await tx.creditBalance.findUnique({ where: { userId: request.userId } })
          if (!balance)
            throw new CreditServiceError(
              'USER_NOT_FOUND',
              'The user has no credit balance record.',
              404,
            )
          return {
            userId: balance.userId,
            availableCredit: balance.availableCredit.toNumber(),
            reserveCredit: balance.reserveCredit.toNumber(),
            lastUpdated: balance.lastUpdated,
            status: 'ALREADY_RESERVED' as const,
          }
        }
        const updated = await tx.creditBalance.updateMany({
          where: { userId: request.userId, availableCredit: { gte: amount } },
          data: { availableCredit: { decrement: amount }, reserveCredit: { increment: amount } },
        })
        if (updated.count !== 1) {
          const balance = await tx.creditBalance.findUnique({ where: { userId: request.userId } })
          if (!balance)
            throw new CreditServiceError(
              'USER_NOT_FOUND',
              'The user has no credit balance record.',
              404,
            )
          throw new CreditServiceError(
            'INSUFFICIENT_CREDITS',
            'The available credit balance is too low.',
            422,
          )
        }
        await tx.transactionRecord.create({
          data: {
            reference,
            senderId: request.userId,
            receiverId: request.userId,
            type: 'CREDIT_RESERVE',
            amount,
          },
        })
        const balance = await tx.creditBalance.findUniqueOrThrow({
          where: { userId: request.userId },
        })
        return {
          userId: balance.userId,
          availableCredit: balance.availableCredit.toNumber(),
          reserveCredit: balance.reserveCredit.toNumber(),
          lastUpdated: balance.lastUpdated,
          status: 'RESERVE_SUCCESS' as const,
        }
      })
    } catch (error) {
      if (
        (error as { code?: string }).code === 'P2002' ||
        (error instanceof CreditServiceError && error.code === 'INSUFFICIENT_CREDITS')
      ) {
        const previous = await existingResponse()
        if (previous) return previous
      }
      throw error
    }
  }
  async releaseCredit(command: ReleaseCreditCommand): Promise<void> {
    const reference = referenceOf(command)
    if (
      command.transactionReference.service !== 'errand' ||
      command.transactionReference.type !== 'CREDIT_RELEASE' ||
      !command.userId
    )
      throw new Error('Invalid release credit command.')
    const amount = positiveAmount(command.amount)
    await prisma.$transaction(async (tx: any) => {
      if (await tx.transactionRecord.findUnique({ where: { reference } })) return
      const conflicting = await tx.transactionRecord.findUnique({
        where: { reference: `errand:${command.transactionReference.id}:CREDIT_TRANSFER` },
      })
      if (conflicting) throw new Error('Cannot release credit for a confirmed errand.')
      const updated = await tx.creditBalance.updateMany({
        where: { userId: command.userId, reserveCredit: { gte: amount } },
        data: { reserveCredit: { decrement: amount }, availableCredit: { increment: amount } },
      })
      if (updated.count !== 1) throw new Error('Insufficient reserved credit for release.')
      await tx.transactionRecord.create({
        data: {
          reference,
          senderId: command.userId,
          receiverId: command.userId,
          type: 'CREDIT_RELEASE',
          amount,
        },
      })
    })
  }

  async transferCredit(command: TransferCreditCommand): Promise<void> {
    const reference = referenceOf(command)
    if (
      command.transactionReference.service !== 'errand' ||
      command.transactionReference.type !== 'CREDIT_TRANSFER' ||
      !command.senderId ||
      !command.receiverId ||
      command.senderId === command.receiverId
    )
      throw new Error('Invalid transfer credit command.')
    const amount = positiveAmount(command.amount)
    await prisma.$transaction(async (tx: any) => {
      if (await tx.transactionRecord.findUnique({ where: { reference } })) return
      const conflicting = await tx.transactionRecord.findUnique({
        where: { reference: `errand:${command.transactionReference.id}:CREDIT_RELEASE` },
      })
      if (conflicting) throw new Error('Cannot transfer credit for a cancelled errand.')
      const debited = await tx.creditBalance.updateMany({
        where: { userId: command.senderId, reserveCredit: { gte: amount } },
        data: { reserveCredit: { decrement: amount } },
      })
      if (debited.count !== 1) throw new Error('Insufficient reserved credit for transfer.')
      await tx.creditBalance.update({
        where: { userId: command.receiverId },
        data: { availableCredit: { increment: amount } },
      })
      await tx.transactionRecord.create({
        data: {
          reference,
          senderId: command.senderId,
          receiverId: command.receiverId,
          type: 'CREDIT_TRANSFER',
          amount,
        },
      })
    })
  }

  async deleteUserCredit(command: DeleteUserCreditCommand): Promise<void> {
    const reference = referenceOf(command)
    if (
      command.transactionReference.service !== 'user' ||
      command.transactionReference.type !== 'USER_DELETION' ||
      command.transactionReference.id !== command.userId
    )
      throw new Error('Invalid user deletion command.')
    await prisma.$transaction(async (tx: any) => {
      if (await tx.transactionRecord.findUnique({ where: { reference } })) return
      const balance = await tx.creditBalance.findUnique({ where: { userId: command.userId } })
      await tx.transactionRecord.create({
        data: {
          reference,
          senderId: command.userId,
          receiverId: 'SYSTEM',
          type: 'USER_DELETION',
          amount: balance
            ? balance.availableCredit.plus(balance.reserveCredit)
            : new Prisma.Decimal(0),
        },
      })
      if (balance) await tx.creditBalance.delete({ where: { userId: command.userId } })
    })
  }

  async checkTables(): Promise<void> {
    await prisma.$transaction([
      prisma.creditBalance.findFirst(),
      prisma.transactionRecord.findFirst(),
    ])
  }
}
