import { describe, expect, it } from 'vitest'
import { AdminService } from '../src/services/admin.service.js'
import type { AdminRepository } from '../src/repositories/admin.repository.js'
import type { LocalImageStorage } from '../src/storage/local-image-storage.js'

const identity = {
  Username: 'user@example.com',
  UserAttributes: [
    { Name: 'sub', Value: 'user-sub' },
    { Name: 'email', Value: 'user@example.com' },
  ],
}
const listed = {
  Username: identity.Username,
  Attributes: [
    ...identity.UserAttributes,
    { Name: 'email_verified', Value: 'true' },
  ],
}

function setup(isAdmin = false) {
  const calls: string[] = []
  const repository = {
    getIdentity: async (email: string) => email === identity.Username ? identity : null,
    isSuperAdmin: async () => false,
    listAdminIdentities: async () => isAdmin ? [listed] : [],
    findProfile: async () => ({ id: 'profile-id' }),
    findProfiles: async () => [{
      id: 'profile-id', cognitoSub: 'user-sub', username: 'TestUser',
      profilePictureKey: null,
    }],
    addAdmin: async (email: string, subject: string) => { calls.push(`add:${email}:${subject}`) },
    removeAdmin: async (email: string, subject: string) => { calls.push(`remove:${email}:${subject}`) },
  } as unknown as AdminRepository
  const service = new AdminService(repository, { url: () => '' } as LocalImageStorage)
  return { service, calls }
}

describe('super admin management', () => {
  it('promotes an existing profile and reports an already promoted user', async () => {
    const { service, calls } = setup()
    await service.promote({ email: 'USER@example.com' })
    expect(calls).toEqual(['add:user@example.com:user-sub'])
    await expect(setup(true).service.promote({ email: identity.Username }))
      .rejects.toMatchObject({ code: 'ALREADY_ADMIN', statusCode: 409 })
  })

  it('demotes an admin and rejects repeated demotion', async () => {
    const { service, calls } = setup(true)
    await service.demote({ email: identity.Username })
    expect(calls).toEqual(['remove:user@example.com:user-sub'])
    await expect(setup().service.demote({ email: identity.Username }))
      .rejects.toMatchObject({ code: 'NOT_ADMIN', statusCode: 409 })
  })

  it('returns complete profile backed admin users', async () => {
    const { service } = setup(true)
    expect(await service.getAdmins()).toEqual([{
      id: 'profile-id', email: 'user@example.com', username: 'TestUser',
      profilePictureUrl: null, emailVerified: true, profileCreated: true, role: 'admin',
    }])
  })

  it('rejects invalid and unknown emails', async () => {
    const { service } = setup()
    await expect(service.promote({ email: 'invalid' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 400 })
    await expect(service.promote({ email: 'missing@example.com' }))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })

  it('never changes the super admin', async () => {
    const { service, calls } = setup()
    const repository = (service as unknown as { repository: { isSuperAdmin: () => Promise<boolean> } }).repository
    repository.isSuperAdmin = async () => true
    await expect(service.promote({ email: identity.Username }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    await expect(service.demote({ email: identity.Username }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    expect(calls).toEqual([])
  })
})
