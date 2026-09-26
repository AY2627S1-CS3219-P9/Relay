import type { User } from '@relay/contracts'
import type { ImageStorage, ImageUpload } from '../storage/image-storage.js'
import type { AuthenticatedUser, UserProfileRecord } from '../types/user.types.js'
import { UserServiceError } from '../types/user.types.js'
import { UserRepository } from '../repositories/user.repository.js'
import {
  validateDeletionConfirmation,
  validateProfileImage,
  validateUpdateProfile,
} from '../validators/user.validator.js'

export interface IdentityGateway {
  deleteAccount(user: AuthenticatedUser): Promise<void>
}

/** Temporary gateway. Can replace this with Cognito deletion later. */
export class MockIdentityGateway implements IdentityGateway {
  async deleteAccount(_user: AuthenticatedUser): Promise<void> {
    return
  }
}

export type ProfileUpdateRequest = {
  username?: string
  profilePicture?: string
}

export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly imageStorage: ImageStorage,
    private readonly identityGateway: IdentityGateway,
  ) {}

  async getUser(user: AuthenticatedUser): Promise<User> {
    const profile = await this.repository.findByCognitoSub(user.sub)
    if (!profile) {
      throw new UserServiceError('NOT_FOUND', 'User profile was not found.', 404)
    }
    return this.toPublicProfile(user, profile)
  }

  async updateUser(
    user: AuthenticatedUser,
    input: ProfileUpdateRequest,
  ): Promise<Pick<User, 'email' | 'username' | 'profilePictureUrl'>> {
    if (!user.emailVerified) {
      throw new UserServiceError(
        'EMAIL_NOT_VERIFIED',
        'Verify your email before creating or updating a profile.',
        403,
      )
    }

    const request = validateUpdateProfile(input)
    const existing = await this.repository.findByCognitoSub(user.sub)
    if (!existing && request.username === undefined) {
      throw new UserServiceError('INVALID_REQUEST', 'A username is required to create a profile.', 400, {
        username: 'Username is required.',
      })
    }

    if (request.username !== undefined) {
      const duplicate = await this.repository.findByUsername(request.username)
      if (duplicate && duplicate.cognitoSub !== user.sub) {
        throw new UserServiceError('CONFLICT', 'That username is already taken.', 409, {
          username: 'Username is already taken.',
        })
      }
    }

    let uploadedImage: ImageUpload | undefined
    let newImageKey: string | undefined
    if (request.profilePicture !== undefined) {
      uploadedImage = validateProfileImage(request.profilePicture)
      const stored = await this.imageStorage.upload(uploadedImage, user.sub)
      newImageKey = stored.key
    }

    try {
      const update = {
        ...(request.username !== undefined ? { username: request.username } : {}),
        ...(newImageKey !== undefined ? { profilePictureKey: newImageKey } : {}),
      }

      const profile = existing
        ? await this.repository.updateProfile(user.sub, update)
        : await this.repository.createProfile(user.sub, update)

      if (newImageKey && existing?.profilePictureKey) {
        await this.imageStorage.delete(existing.profilePictureKey)
      }

      return {
        email: user.email,
        username: profile.username,
        profilePictureUrl: profile.profilePictureKey
          ? this.imageStorage.url(profile.profilePictureKey)
          : null,
      }
    } catch (error) {
      if (newImageKey) {
        await this.deleteUploadedImageSafely(newImageKey)
      }
      if (error instanceof UserServiceError) throw error
      if (isUniqueConstraintError(error)) {
        throw new UserServiceError('CONFLICT', 'That username is already taken.', 409)
      }
      throw error
    }
  }

  async deleteUser(user: AuthenticatedUser, confirmation: unknown): Promise<void> {
    validateDeletionConfirmation(confirmation)

    const existing = await this.repository.findByCognitoSub(user.sub)
    if (!existing) {
      throw new UserServiceError('NOT_FOUND', 'User profile was not found.', 404)
    }

    if (existing.profilePictureKey) {
      await this.imageStorage.delete(existing.profilePictureKey)
    }
    await this.repository.deleteProfile(user.sub)
    await this.identityGateway.deleteAccount(user)
  }

  private toPublicProfile(user: AuthenticatedUser, profile: UserProfileRecord): User {
    return {
      id: 'xxxx' as any, // TODO: match backend user service to new contract
      profileCreated: true,
      email: user.email,
      username: profile.username,
      profilePictureUrl: profile.profilePictureKey
        ? this.imageStorage.url(profile.profilePictureKey)
        : null,
      emailVerified: user.emailVerified,
      role: user.role,
    }
  }

  private async deleteUploadedImageSafely(key: string): Promise<void> {
    try {
      await this.imageStorage.delete(key)
    } catch {
      // Preserve the original database/storage error. Cleanup can be retried separately.
    }
  }
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}
