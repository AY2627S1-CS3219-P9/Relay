import type { User, UserId } from '@relay/contracts'
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  DeleteUserCommand,
  GetUserCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { getEnv } from '../config/env.js'
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
  assertCanDeleteAccount(user: AuthenticatedUser, accessToken: string): Promise<void>
  deleteAccount(user: AuthenticatedUser, accessToken: string): Promise<void>
}

/** Temporary gateway. Can replace this with Cognito deletion later. */
export class MockIdentityGateway implements IdentityGateway {
  async assertCanDeleteAccount(_user: AuthenticatedUser, _accessToken: string): Promise<void> {
    return
  }

  async deleteAccount(_user: AuthenticatedUser, _accessToken: string): Promise<void> {
    return
  }
}

export class CognitoIdentityGateway implements IdentityGateway {
  private readonly client: CognitoIdentityProviderClient

  constructor() {
    const env = getEnv()
    this.client = new CognitoIdentityProviderClient({
      region: env.awsRegion,
      endpoint: env.awsEndpointUrl,
    })
  }

  async assertCanDeleteAccount(user: AuthenticatedUser, _accessToken: string): Promise<void> {
    if (user.role !== 'admin') return

    const env = getEnv()
    let nextToken: string | undefined
    let adminCount = 0

    do {
      const result = await this.client.send(new ListUsersInGroupCommand({
        UserPoolId: env.cognitoUserPoolId,
        GroupName: env.cognitoAdminGroupName,
        NextToken: nextToken,
      }))
      adminCount += result.Users?.length ?? 0
      nextToken = result.NextToken
    } while (nextToken)

    if (adminCount <= 1) {
      throw new UserServiceError(
        'FORBIDDEN',
        'The only admin account cannot be deleted.',
        403,
      )
    }
  }

  async deleteAccount(_user: AuthenticatedUser, accessToken: string): Promise<void> {
    try {
      await this.client.send(new DeleteUserCommand({ AccessToken: accessToken }))
    } catch (error) {
      // Floci currently does not implement DeleteUser. Use the administrative
      // operation locally; production Cognito should use DeleteUser above.
      const operationError = error as { name?: string; __type?: string }
      const unsupported =
        operationError.name === 'UnsupportedOperation' ||
        operationError.name === 'UnsupportedOperationException' ||
        operationError.__type === 'UnsupportedOperation'
      if (!unsupported) throw error
      const env = getEnv()
      const currentUser = await this.client.send(new GetUserCommand({ AccessToken: accessToken }))
      const username = currentUser.Username
      if (!username) throw new Error('Cognito did not return a username for deletion.')
      await this.client.send(new AdminDeleteUserCommand({
        UserPoolId: env.cognitoUserPoolId,
        Username: username,
      }))
    }
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
      throw new UserServiceError('PROFILE_NOT_FOUND', 'User profile was not found.', 404)
    }
    return this.toPublicProfile(user, profile)
  }

  async updateUser(
    user: AuthenticatedUser,
    input: ProfileUpdateRequest,
  ): Promise<User> {
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
      throw new UserServiceError('VALIDATION_FAILED', 'A username is required to create a profile.', 400, {
        username: 'Username is required.',
      })
    }

    if (request.username !== undefined) {
      const duplicate = await this.repository.findByUsername(request.username)
      if (duplicate && duplicate.cognitoSub !== user.sub) {
        throw new UserServiceError('USERNAME_TAKEN', 'That username is already taken.', 409, {
          username: 'Username is already taken.',
        })
      }
    }

    let uploadedImage: ImageUpload | undefined
    let newImageKey: string | null | undefined
    if (request.profilePicture !== undefined && request.profilePicture !== null) {
      uploadedImage = validateProfileImage(request.profilePicture)
      const stored = await this.imageStorage.upload(uploadedImage, user.sub)
      newImageKey = stored.key
    } else if (request.profilePicture === null) {
      newImageKey = null
    }

    try {
      const update = {
        ...(request.username !== undefined ? { username: request.username } : {}),
        ...(newImageKey !== undefined ? { profilePictureKey: newImageKey } : {}),
      }

      const profile = existing
        ? await this.repository.updateProfile(user.sub, update)
        : await this.repository.createProfile(user.sub, update)

      if (newImageKey !== undefined && existing?.profilePictureKey) {
        await this.imageStorage.delete(existing.profilePictureKey)
      }

      return this.toPublicProfile(user, profile)
    } catch (error) {
      if (newImageKey) {
        await this.deleteUploadedImageSafely(newImageKey)
      }
      if (error instanceof UserServiceError) throw error
      if (isUniqueConstraintError(error)) {
        throw new UserServiceError('USERNAME_TAKEN', 'That username is already taken.', 409)
      }
      throw error
    }
  }

  async deleteUser(user: AuthenticatedUser, confirmation: unknown, accessToken: string): Promise<void> {
    const existing = await this.repository.findByCognitoSub(user.sub)
    if (!existing) {
      throw new UserServiceError('PROFILE_NOT_FOUND', 'User profile was not found.', 404)
    }
    validateDeletionConfirmation(confirmation, existing.username)

    // Delete the identity first. If Cognito rejects the request, keep the
    // local profile and image intact so the user can retry safely.
    await this.identityGateway.assertCanDeleteAccount(user, accessToken)
    await this.identityGateway.deleteAccount(user, accessToken)

    if (existing.profilePictureKey) {
      await this.imageStorage.delete(existing.profilePictureKey)
    }
    await this.repository.deleteProfile(user.sub)
  }

  private toPublicProfile(user: AuthenticatedUser, profile: UserProfileRecord): User {
    return {
      id: profile.id as UserId,
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
