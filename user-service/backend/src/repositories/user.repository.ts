import { PrismaClient } from '@prisma/client'
import type { NewUserEvent } from '@relay/contracts'
import type { ProfileUpdate, UserProfileRecord } from '../types/user.types.js'

export const prisma = new PrismaClient()

type PersistedUserProfile = {
  id: string
  cognitoSub: string
  username: string | null
  profilePictureKey: string | null
  createdAt: Date
  updatedAt: Date
}

function toProfileRecord(profile: PersistedUserProfile): UserProfileRecord {
  return {
    id: profile.id,
    cognitoSub: profile.cognitoSub,
    username: profile.username,
    profilePictureKey: profile.profilePictureKey,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

export class UserRepository {
  async findByCognitoSub(cognitoSub: string): Promise<UserProfileRecord | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { cognitoSub },
    })
    return profile ? toProfileRecord(profile) : null
  }

  async findByUsername(username: string): Promise<UserProfileRecord | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { username },
    })
    return profile ? toProfileRecord(profile) : null
  }

  async createProfile(cognitoSub: string, update: ProfileUpdate): Promise<UserProfileRecord> {
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.userProfile.create({
        data: {
          cognitoSub,
          username: update.username,
          profilePictureKey: update.profilePictureKey,
        },
      })
      await tx.userOutboxEvent.create({
        data: {
          topic: 'relay.user.created',
          key: cognitoSub,
          payload: { cognitoSub } satisfies NewUserEvent,
        },
      })
      return created
    })
    return toProfileRecord(profile)
  }

  async updateProfile(cognitoSub: string, update: ProfileUpdate): Promise<UserProfileRecord> {
    const profile = await prisma.userProfile.update({
      where: { cognitoSub },
      data: {
        ...(update.username !== undefined ? { username: update.username } : {}),
        ...(update.profilePictureKey !== undefined
          ? { profilePictureKey: update.profilePictureKey }
          : {}),
      },
    })
    return toProfileRecord(profile)
  }

  async deleteProfile(cognitoSub: string): Promise<UserProfileRecord> {
    const profile = await prisma.userProfile.delete({
      where: { cognitoSub },
    })
    return toProfileRecord(profile)
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
