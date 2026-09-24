import express from 'express'
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from './db'
import { SupplierErrors } from '@relay/contracts/supplier'
import type { Location, OperatingHours, ServiceType } from '@relay/contracts/supplier'
import type { UserApi, SessionId } from '@relay/contracts/user'

const router = express.Router()

function normalizeSupplier(row: any): {
  id: string
  name: string
  location: Location
  isOperational: boolean
  operatingHours: OperatingHours
  serviceTypes: ServiceType[]
} {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    isOperational: row.is_operational,
    operatingHours: row.operating_hours,
    serviceTypes: row.service_types,
  }
}

// Helper to validate user is admin (for admin routes)
async function validateAdmin(sessionId: SessionId): Promise<void> {
  // Call UserApi.isAdmin(sessionId)
  // For now, this is a placeholder
}

// GET /api/supplier - Get all suppliers (public)
router.get('/', async (req, res) => {
  try {
    const suppliers = await getSuppliers()
    res.json({ suppliers: suppliers.map(normalizeSupplier) })
  } catch (err) {
    console.error('Error fetching suppliers:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

// GET /api/supplier/:id - Get single supplier (public)
router.get('/:id', async (req, res) => {
  try {
    const supplier = await getSupplierById(req.params.id)
    if (!supplier) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Supplier not found' })
    }
    res.json({ supplier: normalizeSupplier(supplier[0]) })
  } catch (err) {
    console.error('Error fetching supplier:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

// POST /api/supplier - Create supplier (admin only)
router.post('/', async (req, res) => {
  const sessionId = req.query.sessionId as SessionId
  if (!sessionId) {
    res.status(401).json({ code: SupplierErrors.SESSION_EXPIRED, message: 'SessionId required' })
    return
  }

  try {
    await validateAdmin(sessionId)

    const { name, location, isOperational, operatingHours, serviceTypes } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'Name is required' })
    }
    if (!location || typeof location !== 'object') {
      return res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'Location is required' })
    }
    if (typeof isOperational !== 'boolean') {
      return res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'isOperational is required' })
    }
    if (!operatingHours || typeof operatingHours !== 'object') {
      return res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'OperatingHours is required' })
    }
    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return res.status(400).json({ code: SupplierErrors.INVALID_REQUEST, message: 'serviceTypes is required' })
    }

    const result = await createSupplier(
      name,
      JSON.stringify(location),
      isOperational,
      JSON.stringify(operatingHours),
      serviceTypes,
    )

    res.status(201).json({ supplier: normalizeSupplier(result[0]) })
  } catch (err) {
    console.error('Error creating supplier:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

// PUT /api/supplier/:id - Update supplier (admin only)
router.put('/:id', async (req, res) => {
  const sessionId = req.query.sessionId as SessionId
  if (!sessionId) {
    res.status(401).json({ code: SupplierErrors.SESSION_EXPIRED, message: 'SessionId required' })
    return
  }

  try {
    await validateAdmin(sessionId)

    const { name, location, isOperational, operatingHours, serviceTypes } = req.body
    const id = req.params.id

    // Check if supplier exists first
    const existing = await getSupplierById(id)
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Supplier not found' })
    }

    const result = await updateSupplier(
      id,
      name !== undefined ? name : undefined,
      location !== undefined ? JSON.stringify(location) : undefined,
      isOperational !== undefined ? isOperational : undefined,
      operatingHours !== undefined ? JSON.stringify(operatingHours) : undefined,
      serviceTypes !== undefined ? serviceTypes : undefined,
    )

    res.json({ supplier: normalizeSupplier(result[0]) })
  } catch (err) {
    console.error('Error updating supplier:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

// DELETE /api/supplier/:id - Delete supplier (admin only)
router.delete('/:id', async (req, res) => {
  const sessionId = req.query.sessionId as SessionId
  if (!sessionId) {
    res.status(401).json({ code: SupplierErrors.SESSION_EXPIRED, message: 'SessionId required' })
    return
  }

  try {
    await validateAdmin(sessionId)

    const deleted = await deleteSupplier(req.params.id)
    if (!deleted) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Supplier not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error('Error deleting supplier:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

export default router
