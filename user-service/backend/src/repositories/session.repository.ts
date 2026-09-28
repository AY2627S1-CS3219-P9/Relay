import type { UserRole } from '@relay/contracts'
import { prisma } from './user.repository.js'

export type StoredSession = {
  id: string
  tokenHash: string
  cognitoSub: string
  email: string
  emailVerified: boolean
  role: UserRole
  cognitoAccessToken: string
  expiresAt: Date
  revokedAt: Date | null
}

export class SessionRepository {
  async create(data: Omit<StoredSession, 'id' | 'revokedAt'>): Promise<StoredSession> {
    return prisma.userSession.create({ data }) as Promise<StoredSession>
  }

  async findActiveByTokenHash(tokenHash: string, now = new Date()): Promise<StoredSession | null> {
    return prisma.userSession.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
    }) as Promise<StoredSession | null>
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async revokeByCognitoSub(cognitoSub: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { cognitoSub, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
