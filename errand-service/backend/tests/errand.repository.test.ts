import { describe, expect, it } from 'vitest'
import type { Errand } from '@relay/contracts'
import { sortRequesterErrands } from '../src/utils/errand-ordering.js'

function row(status: Errand['status'], createdAt: string, id: string) {
  return {
    id,
    requesterSub: 'requester-1',
    courierSub: null,
    supplierId: 'supplier-1',
    pickupLat: 1,
    pickupLng: 103,
    pickupBuildingName: 'Pickup',
    pickupFloorNumber: 1,
    targetLat: 1,
    targetLng: 103,
    targetBuildingName: 'Target',
    targetFloorNumber: 2,
    name: id,
    supplierName: 'Supplier',
    serviceType: 1,
    deliveryDescription: 'Description',
    deliveryInstructions: null,
    creditAmount: 10,
    status,
    expiresAt: new Date('2026-10-20T00:00:00.000Z'),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  }
}

describe('ErrandRepository requester ordering', () => {
  it('orders by lifecycle sequence, then earliest start time within each state', async () => {
    const errands = [
      row('CONFIRMED', '2026-10-01T00:00:00.000Z', 'confirmed'),
      row('OPEN', '2026-10-03T00:00:00.000Z', 'open-late'),
      row('DELIVERED', '2026-10-04T00:00:00.000Z', 'delivered-late'),
      row('OPEN', '2026-10-02T00:00:00.000Z', 'open-early'),
      row('DELIVERED', '2026-10-01T00:00:00.000Z', 'delivered-early'),
      row('CANCELLED', '2026-10-01T00:00:00.000Z', 'cancelled'),
    ] as Errand[]

    sortRequesterErrands(errands)

    expect(errands.map((errand) => errand.id)).toEqual([
      'open-early',
      'open-late',
      'delivered-early',
      'delivered-late',
      'confirmed',
      'cancelled',
    ])
  })
})
