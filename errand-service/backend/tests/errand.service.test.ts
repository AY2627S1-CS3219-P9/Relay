import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrandRepository } from '../src/repositories/errand.repository.js'
import { ErrandService } from '../src/services/errand.service.js'

const user = {
  sub: 'requester-1',
  email: 'requester@example.com',
  emailVerified: true,
  role: 'user' as const,
  profileCreated: true,
}

function createRepositoryMock() {
  return {
    expireOpenErrands: vi.fn().mockResolvedValue(0),
    listOwnedBy: vi.fn().mockResolvedValue([]),
    listVisibleTo: vi.fn().mockResolvedValue([]),
    listSupplierView: vi.fn().mockResolvedValue([]),
  } as unknown as ErrandRepository
}

describe('ErrandService read scopes', () => {
  let repository: ReturnType<typeof createRepositoryMock>
  let service: ErrandService

  beforeEach(() => {
    repository = createRepositoryMock()
    service = new ErrandService(repository)
  })

  it('lists only requester-owned errands for the mine scope', async () => {
    await service.getErrands(user, { scope: 'mine' })

    expect(repository.expireOpenErrands).toHaveBeenCalledOnce()
    expect(repository.listOwnedBy).toHaveBeenCalledWith(user.sub)
    expect(repository.listVisibleTo).not.toHaveBeenCalled()
  })

  it('preserves the existing visible listing by default', async () => {
    await service.getErrands(user)

    expect(repository.expireOpenErrands).toHaveBeenCalledOnce()
    expect(repository.listVisibleTo).toHaveBeenCalledWith(user.sub)
    expect(repository.listOwnedBy).not.toHaveBeenCalled()
  })

  it('uses the authenticated subject for supplier explore views', async () => {
    await service.getSupplierErrandView(user, { scope: 'explore', supplierId: 'supplier-1' })

    expect(repository.expireOpenErrands).toHaveBeenCalledOnce()
    expect(repository.listSupplierView).toHaveBeenCalledWith({
      scope: 'explore',
      supplierId: 'supplier-1',
      viewerSub: user.sub,
    })
  })

  it('uses the authenticated subject for supplier mine views', async () => {
    await service.getSupplierErrandView(user, { scope: 'mine' })

    expect(repository.listSupplierView).toHaveBeenCalledWith({
      scope: 'mine',
      viewerSub: user.sub,
    })
  })
})
