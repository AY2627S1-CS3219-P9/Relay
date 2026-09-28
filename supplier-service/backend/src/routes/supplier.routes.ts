import { Router } from 'express'
import { SupplierController } from '../controllers/supplier.controller'

export function createSupplierRouter(controller: SupplierController) {
  const router = Router()

  // GET /api/supplier - Get all suppliers (authenticated users only)
  router.get('/', controller.getAllSuppliers)

  // GET /api/supplier/:id - Get single supplier (authenticated users only)
  router.get('/:id', controller.getSupplierById)

  // POST /api/supplier - Create supplier (admin only)
  router.post('/', controller.createSupplier)

  // PUT /api/supplier/:id - Update supplier (admin only)
  router.put('/:id', controller.updateSupplier)

  // DELETE /api/supplier/:id - Delete supplier (admin only)
  router.delete('/:id', controller.deleteSupplier)

  return router
}
