import { describe, expect, it, vi } from 'vitest'
import type { CreateErrandRequest } from '@relay/contracts'
import { ErrandService } from '../src/services/errand.service.js'
import type { ErrandRepository } from '../src/repositories/errand.repository.js'
import type { CreditClient } from '../src/clients/credit.client.js'

const user = {
  sub: 'requester', email: 'requester@example.com', emailVerified: true,
  role: 'user' as const, profileCreated: true,
}
const request: CreateErrandRequest = {
  name: 'Delivery',
  supplierDetails: { supplierId: 'supplier', supplierName: 'Supplier', serviceType: 1 },
  pickupLocation: { lat: 1, lng: 103, buildingName: 'Pickup', floorNumber: 1 },
  targetLocation: { lat: 1, lng: 103, buildingName: 'Target', floorNumber: 2 },
  deliveryDetails: { description: 'Deliver parcel' },
  creditAmount: 10,
}

function setup() {
  const repository = {
    addPendingErrand: vi.fn().mockResolvedValue('pending-id'),
    createErrand: vi.fn().mockResolvedValue({ id: 'pending-id', requesterSub: user.sub }),
  }
  const credit = { reserve: vi.fn().mockResolvedValue(undefined) }
  const service = new ErrandService(
    repository as unknown as ErrandRepository,
    credit as unknown as CreditClient,
  )
  return { service, repository, credit }
}

describe('errand creation and credit reservation', () => {
  it('reserves credit between pending insert and atomic completion', async () => {
    const { service, repository, credit } = setup()
    await service.createErrand(user, request)
    expect(repository.addPendingErrand).toHaveBeenCalledWith(user.sub)
    expect(credit.reserve).toHaveBeenCalledWith('pending-id', user.sub, 10)
    expect(repository.createErrand).toHaveBeenCalledWith('pending-id', user.sub, request)
    expect(repository.addPendingErrand.mock.invocationCallOrder[0])
      .toBeLessThan(credit.reserve.mock.invocationCallOrder[0])
    expect(credit.reserve.mock.invocationCallOrder[0])
      .toBeLessThan(repository.createErrand.mock.invocationCallOrder[0])
  })

  it('leaves the pending row for recovery if reservation fails', async () => {
    const { service, repository, credit } = setup()
    credit.reserve.mockRejectedValue(new Error('Credit unavailable'))
    await expect(service.createErrand(user, request)).rejects.toThrow('Credit unavailable')
    expect(repository.createErrand).not.toHaveBeenCalled()
  })

  it('rejects unverified users before inserting a pending row', async () => {
    const { service, repository, credit } = setup()
    await expect(service.createErrand({ ...user, emailVerified: false }, request)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(repository.addPendingErrand).not.toHaveBeenCalled()
    expect(credit.reserve).not.toHaveBeenCalled()
  })
})

