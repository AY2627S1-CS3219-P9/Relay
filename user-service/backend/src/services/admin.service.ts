import type { User, UserId } from '@relay/contracts'
import { LocalImageStorage } from '../storage/local-image-storage.js'
import { UserServiceError } from '../types/user.types.js'
import { validateAdminEmail } from '../validators/admin.validator.js'
import { AdminRepository } from '../repositories/admin.repository.js'

export class AdminService {
  constructor(
    private readonly repository = new AdminRepository(),
    private readonly imageStorage = new LocalImageStorage(),
  ) {}

  async getAdmins(): Promise<User[]> {
    const identities = await this.repository.listAdminIdentities()
    const subjects = identities.map((identity) =>
      identity.Attributes?.find((attribute) => attribute.Name === 'sub')?.Value
    ).filter((subject): subject is string => Boolean(subject))
    const profiles = await this.repository.findProfiles(subjects)
    const bySubject = new Map(profiles.map((profile) => [profile.cognitoSub, profile]))
    const users = await Promise.all(identities.map(async (identity): Promise<User | null> => {
      const attributes = new Map(identity.Attributes?.map((attribute) => [attribute.Name, attribute.Value]))
      const subject = attributes.get('sub')
      const profile = subject ? bySubject.get(subject) : undefined
      const email = attributes.get('email')
      if (!profile || !email) {
        throw new UserServiceError('PROFILE_NOT_FOUND', 'An admin account has no complete Relay profile.', 404)
      }
      return {
        id: profile.id as UserId,
        email,
        username: profile.username,
        profilePictureUrl: profile.profilePictureKey
          ? await this.imageStorage.url(profile.profilePictureKey)
          : null,
        emailVerified: attributes.get('email_verified') === 'true',
        profileCreated: true,
        role: 'admin',
      }
    }))
    return users.filter((user): user is User => user !== null)
  }

  async promote(input: unknown): Promise<void> {
    const email = validateAdminEmail(input)
    const identity = await this.repository.getIdentity(email)
    if (!identity) throw new UserServiceError('USER_NOT_FOUND', 'No user exists with that email.', 404)
    if (await this.repository.isSuperAdmin(email)) {
      throw new UserServiceError('FORBIDDEN', 'The super admin role cannot be changed.', 403)
    }
    const admins = await this.repository.listAdminIdentities()
    if (admins.some((admin) => admin.Attributes?.some((attribute) => attribute.Name === 'sub' && attribute.Value === identity.UserAttributes?.find((item) => item.Name === 'sub')?.Value))) {
      throw new UserServiceError('ALREADY_ADMIN', 'This user is already an admin.', 409)
    }
    const subject = identity.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value
    if (!subject) throw new UserServiceError('INTERNAL_ERROR', 'The identity has no subject.', 500)
    if (!await this.repository.findProfile(subject)) {
      throw new UserServiceError('PROFILE_NOT_FOUND', 'The user must create a Relay profile before promotion.', 404)
    }
    await this.repository.addAdmin(email, subject)
  }

  async demote(input: unknown): Promise<void> {
    const email = validateAdminEmail(input)
    const identity = await this.repository.getIdentity(email)
    if (!identity) throw new UserServiceError('USER_NOT_FOUND', 'No user exists with that email.', 404)
    if (await this.repository.isSuperAdmin(email)) {
      throw new UserServiceError('FORBIDDEN', 'The super admin role cannot be changed.', 403)
    }
    const admins = await this.repository.listAdminIdentities()
    if (!admins.some((admin) => admin.Attributes?.some((attribute) => attribute.Name === 'sub' && attribute.Value === identity.UserAttributes?.find((item) => item.Name === 'sub')?.Value))) {
      throw new UserServiceError('NOT_ADMIN', 'This user is not an admin.', 409)
    }
    const subject = identity.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value
    if (!subject) throw new UserServiceError('INTERNAL_ERROR', 'The identity has no subject.', 500)
    await this.repository.removeAdmin(email, subject)
  }
}
