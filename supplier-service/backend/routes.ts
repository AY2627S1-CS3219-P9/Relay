import express from 'express'
import { getSuppliers } from './db'

const router = express.Router()

// GET /api/supplier - Get all suppliers (public)
router.get('/', async (req, res) => {
  try {
    const suppliers = await getSuppliers()
    res.json({ suppliers })
  } catch (err) {
    console.error('Error fetching suppliers:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Database error' })
  }
})

// GET /api/supplier/:id - Get single supplier (public)
router.get('/:id', async (req, res) => {
  // TODO: Implement
  res
    .status(501)
    .json({ code: 'NOT_IMPLEMENTED', message: 'GET /api/supplier/:id not implemented yet' })
})

// POST /api/supplier - Create supplier (admin only)
router.post('/', async (req, res) => {
  // TODO:
  // - Add admin validation middleware
  // - Validate request body
  // - Call createSupplier
  res
    .status(501)
    .json({ code: 'NOT_IMPLEMENTED', message: 'POST /api/supplier not implemented yet' })
})

// PUT /api/supplier/:id - Update supplier (admin only)
router.put('/:id', async (req, res) => {
  // TODO:
  // - Add admin validation middleware
  // - Validate request body
  // - Call updateSupplier
  res
    .status(501)
    .json({ code: 'NOT_IMPLEMENTED', message: 'PUT /api/supplier/:id not implemented yet' })
})

// DELETE /api/supplier/:id - Delete supplier (admin only)
router.delete('/:id', async (req, res) => {
  // TODO:
  // - Add admin validation middleware
  // - Validate request body
  // - Call deleteSupplier
  res
    .status(501)
    .json({ code: 'NOT_IMPLEMENTED', message: 'DELETE /api/supplier/:id not implemented yet' })
})

export default router
