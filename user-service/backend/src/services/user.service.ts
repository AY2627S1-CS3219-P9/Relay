import type { User, UserId, UserProfileSummary } from '@relay/contracts'
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  DeleteUserCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { getEnv } from '../config/env.js'
import type { ImageStorage, ImageUpload } from '../storage/image-storage.js'
import type { AuthenticatedUser, UserProfileRecord } from '../types/user.types.js'
import { UserServiceError } from '../types/user.types.js'
import { UserRepository } from '../repositories/user.repository.js'
import { SessionRepository } from '../repositories/session.repository.js'
import {
  validateDeletionConfirmation,
  validateProfileImage,
  validateUpdateProfile,
} from '../validators/user.validator.js'

export interface IdentityGateway {
  deleteAccount(user: AuthenticatedUser, accessToken: string): Promise<void>
}

/** Temporary gateway. Can replace this with Cognito deletion later. */
export class MockIdentityGateway implements IdentityGateway {
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
      await this.client.send(
        new AdminDeleteUserCommand({
          UserPoolId: env.cognitoUserPoolId,
          Username: username,
        }),
      )
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
    private readonly sessions: SessionRepository,
  ) {}

  async getUser(user: AuthenticatedUser): Promise<User> {
    const profile = await this.repository.findByCognitoSub(user.sub)
    if (!profile) {
      throw new UserServiceError('PROFILE_NOT_FOUND', 'User profile was not found.', 404)
    }
    return this.toPublicProfile(user, profile)
  }

  async getProfileByCognitoSub(cognitoSub: string): Promise<UserProfileSummary> {
    const profile = await this.repository.findByCognitoSub(cognitoSub)
    if (!profile) {
      throw new UserServiceError('PROFILE_NOT_FOUND', 'User profile was not found.', 404)
    }

    return {
      username: profile.username,
      profilePictureUrl: profile.profilePictureKey
        ? this.imageStorage.url(profile.profilePictureKey)
        : null,
    }
  }

  async updateUser(user: AuthenticatedUser, input: ProfileUpdateRequest): Promise<User> {
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
      throw new UserServiceError(
        'VALIDATION_FAILED',
        'A username is required to create a profile.',
        400,
        {
          username: 'Username is required.',
        },
      )
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

    let profile: UserProfileRecord
    try {
      const update = {
        ...(request.username !== undefined ? { username: request.username } : {}),
        ...(newImageKey !== undefined ? { profilePictureKey: newImageKey } : {}),
      }
      profile = existing
        ? await this.repository.updateProfile(user.sub, update)
        : await this.repository.createProfile(user.sub, update)
    } catch (error) {
      if (newImageKey) await this.deleteUploadedImageSafely(newImageKey)
      if (error instanceof UserServiceError) throw error
      if (isUniqueConstraintError(error)) {
        throw new UserServiceError('USERNAME_TAKEN', 'That username is already taken.', 409)
      }
      throw error
    }

    if (newImageKey !== undefined && existing?.profilePictureKey) {
      await this.deleteUploadedImageSafely(existing.profilePictureKey)
    }
    return this.toPublicProfile(user, profile)
  }

  async deleteUser(
    user: AuthenticatedUser,
    confirmation: unknown,
    accessToken: string,
  ): Promise<void> {
    if (user.role === 'super-admin') {
      throw new UserServiceError('FORBIDDEN', 'The super admin account cannot be deleted.', 403)
    }
    const existing = await this.repository.findByCognitoSub(user.sub)
    if (!existing) {
      throw new UserServiceError('PROFILE_NOT_FOUND', 'User profile was not found.', 404)
    }
    validateDeletionConfirmation(confirmation, existing.username)

    // Revoke first so a partial deletion cannot leave a valid Relay session.
    await this.sessions.revokeByCognitoSub(user.sub)
    await this.identityGateway.deleteAccount(user, accessToken)
    await this.repository.deleteProfile(user.sub)
    if (existing.profilePictureKey) {
      await this.deleteUploadedImageSafely(existing.profilePictureKey)
    }
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
