import { describe, expect, it } from 'vitest'
import { UserService } from '../src/services/user.service.js'
import type { UserRepository } from '../src/repositories/user.repository.js'
import type { ImageStorage } from '../src/storage/image-storage.js'
import type { AuthenticatedUser } from '../src/types/user.types.js'

const profile = {
  id: 'profile-id', cognitoSub: 'user-sub', username: 'Alice',
  profilePictureKey: 'old-image', createdAt: new Date(), updatedAt: new Date(),
}
const admin: AuthenticatedUser = {
  sub: 'user-sub', email: 'admin@example.com', emailVerified: true, role: 'admin',
}

describe('account and profile consistency', () => {
  it('lets a normal admin delete their own account', async () => {
    const calls: string[] = []
    const service = new UserService(
      {
        findByCognitoSub: async () => profile,
        deleteProfile: async () => { calls.push('profile') },
      } as unknown as UserRepository,
      { delete: async () => { calls.push('image') } } as unknown as ImageStorage,
      { deleteAccount: async () => { calls.push('identity') } },
    )
    await service.deleteUser(admin, 'Alice')
    expect(calls).toEqual(['identity', 'profile', 'image'])
  })

  it('protects the sole super admin account', async () => {
    const service = new UserService(
      { findByCognitoSub: async () => profile } as unknown as UserRepository,
      {} as ImageStorage,
      { deleteAccount: async () => { throw new Error('must not delete') } },
    )
    await expect(service.deleteUser({ ...admin, role: 'super-admin' }, 'Alice'))
      .rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('keeps a newly saved image when old image cleanup fails', async () => {
    const deleted: string[] = []
    const service = new UserService(
      {
        findByCognitoSub: async () => profile,
        updateProfile: async () => ({ ...profile, profilePictureKey: 'new-image' }),
      } as unknown as UserRepository,
      {
        upload: async () => ({ key: 'new-image' }),
        delete: async (key: string) => { deleted.push(key); throw new Error('storage unavailable') },
        url: (key: string) => key,
      } as unknown as ImageStorage,
      { deleteAccount: async () => {} },
    )
    const result = await service.updateUser(admin, { profilePicture: 'data:image/png;base64,aGVsbG8=' })
    expect(result.profilePictureUrl).toBe('new-image')
    expect(deleted).toEqual(['old-image'])
  })
})
