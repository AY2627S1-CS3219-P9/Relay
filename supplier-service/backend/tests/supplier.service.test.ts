import assert from 'node:assert/strict'
import type { Supplier } from '@relay/contracts'
import { SupplierService } from '../src/services/supplier.service'
import { isSupplierActive } from '../src/services/supplier-availability'

const supplier: Supplier = {
  id: 'supplier-1',
  name: 'Test Supplier',
  location: { lat: 1, lng: 103, buildingName: 'Test Building', floorNumber: 1 },
  isOperational: true,
  operatingHours: { openingTime: '09:00', closingTime: '18:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
  serviceTypes: [0],
}

assert.equal(
  isSupplierActive(
    {
      ...supplier,
      operatingHours: { openingTime: '11:00', closingTime: '02:00', daysOfWeek: [0] },
    },
    new Date('2026-10-12T18:00:00.000Z'),
  ),
  true,
)

async function main(): Promise<void> {
  const service = new SupplierService(
    {
      findById: async (id: string) => (id === supplier.id ? supplier : null),
    } as never,
  )

  assert.deepEqual(
    await service.validateSupplierSelection({ supplierId: supplier.id }),
    { valid: true, supplierId: supplier.id },
  )

  assert.deepEqual(
    await service.validateSupplierSelection({ supplierId: 'missing' }),
    {
      valid: false,
      supplierId: 'missing',
      code: 'SUPPLIER_NOT_FOUND',
      message: 'Supplier not found.',
    },
  )

  console.log('supplier service checks passed')
}

void main()
