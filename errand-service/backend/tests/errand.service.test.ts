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

describe('ErrandService cancellation', () => {
  it('allows the requester to cancel an open errand', async () => {
    const errand = {
      id: 'errand-1',
      requesterSub: user.sub,
      courierSub: null,
      courierProfile: null,
      status: 'OPEN' as const,
    }
    const repository = {
      findVisibleById: vi.fn().mockResolvedValue(errand),
      cancel: vi.fn().mockResolvedValue({ ...errand, status: 'CANCELLED' as const }),
    } as unknown as ErrandRepository
    const service = new ErrandService(repository)

    const result = await service.cancelErrand(user, errand.id)

    expect(repository.cancel).toHaveBeenCalledWith(errand.id, user.sub)
    expect(result.status).toBe('CANCELLED')
  })

  it('rejects cancellation by a courier or another user', async () => {
    const errand = {
      id: 'errand-1',
      requesterSub: 'requester-2',
      courierSub: user.sub,
      courierProfile: null,
      status: 'ACCEPTED' as const,
    }
    const repository = {
      findVisibleById: vi.fn().mockResolvedValue(errand),
      cancel: vi.fn(),
    } as unknown as ErrandRepository
    const service = new ErrandService(repository)

    await expect(service.cancelErrand(user, errand.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    })
    expect(repository.cancel).not.toHaveBeenCalled()
  })

  it('rejects requester cancellation unless the errand is open', async () => {
    const errand = {
      id: 'errand-1',
      requesterSub: user.sub,
      courierSub: 'courier-1',
      courierProfile: null,
      status: 'ACCEPTED' as const,
    }
    const repository = {
      findVisibleById: vi.fn().mockResolvedValue(errand),
      cancel: vi.fn(),
    } as unknown as ErrandRepository
    const service = new ErrandService(repository)

    await expect(service.cancelErrand(user, errand.id)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
      statusCode: 409,
    })
    expect(repository.cancel).not.toHaveBeenCalled()
  })
})
