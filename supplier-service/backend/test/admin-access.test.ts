import test from 'node:test'
import assert from 'node:assert/strict'
import { SupplierController } from '../src/controllers/supplier.controller'

for (const role of ['admin', 'super-admin'] as const) {
  test(`${role} can create, update and delete suppliers`, async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = async () => new Response(JSON.stringify({
      ok: true, data: { user: { role } },
    }), { status: 200 })
    try {
      const controller = new SupplierController({
        createSupplier: async () => { calls.push('create'); return { id: 'supplier-1' } },
        updateSupplier: async () => { calls.push('update'); return { id: 'supplier-1' } },
        deleteSupplier: async () => { calls.push('delete') },
      } as never)
      const makeReq = (body: unknown) => ({
        header: () => 'relay_session=test',
        body,
        params: { id: 'supplier-1' },
      })
      const makeRes = () => {
        const response: Record<string, unknown> = { statusCode: 200 }
        response.status = (code: number) => { response.statusCode = code; return response }
        response.json = (_body: unknown) => response
        response.send = () => response
        return response
      }
      const next = (error: unknown) => { throw error }
      const body = {
        name: 'Supplier', location: { lat: 1, lng: 103, buildingName: 'Building', floorNumber: 1 },
        isOperational: true, operatingHours: { openingTime: '09:00', closingTime: '18:00', daysOfWeek: [1] },
        serviceTypes: [0],
      }
      await controller.createSupplier(makeReq(body) as never, makeRes() as never, next as never)
      await controller.updateSupplier(makeReq(body) as never, makeRes() as never, next as never)
      await controller.deleteSupplier(makeReq(body) as never, makeRes() as never, next as never)
      assert.deepEqual(calls, ['create', 'update', 'delete'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })
}

test('ordinary users cannot mutate suppliers', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true, data: { user: { role: 'user' } },
  }), { status: 200 })
  try {
    const controller = new SupplierController({
      updateSupplier: async () => { throw new Error('must not update') },
    } as never)
    const response: Record<string, unknown> = { statusCode: 200 }
    response.status = (code: number) => { response.statusCode = code; return response }
    response.json = (_body: unknown) => response
    await controller.updateSupplier({
      header: () => 'relay_session=test', body: {}, params: { id: 'supplier-1' },
    } as never, response as never, (error: unknown) => { throw error })
    assert.equal(response.statusCode, 403)
  } finally {
    globalThis.fetch = originalFetch
  }
})
