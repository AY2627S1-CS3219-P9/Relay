import assert from 'node:assert/strict'
import { buildSupplierFilter } from '../src/db'

// No filters -> no WHERE clause.
assert.deepEqual(buildSupplierFilter(), { where: '', params: [] })

// 'all' status is treated as no status filter.
assert.deepEqual(buildSupplierFilter({ status: 'all' }), { where: '', params: [] })

// Status filter.
assert.deepEqual(buildSupplierFilter({ status: 'operational' }), {
  where: 'is_operational = $1',
  params: [true],
})

// Service type filter uses array overlap (&&) for OR logic.
// Supplier matches if it has ANY of the requested service types.
assert.deepEqual(buildSupplierFilter({ serviceTypes: [0, 2] }), {
  where: 'service_types && $1',
  params: [[0, 2]],
})

// Empty service type selection returns empty result (FALSE).
// Note: frontend should omit the param entirely to get all suppliers.
assert.deepEqual(buildSupplierFilter({ serviceTypes: [] }), { where: 'FALSE', params: [] })

// Combined filters keep parameter order.
assert.deepEqual(buildSupplierFilter({ status: 'not-operational', serviceTypes: [3] }), {
  where: 'is_operational = $1 AND service_types && $2',
  params: [false, [3]],
})

console.log('supplier filter checks passed')
