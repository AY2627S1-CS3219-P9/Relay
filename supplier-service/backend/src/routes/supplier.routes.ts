// AI Assistance Disclosure:
// Tool: OpenCode (Qwen3-Coder-Next)
// Date: 2026-09-28
// Scope: Scaffolded route wiring for the existing Supplier API interfaces and authorization behavior.
// Author review: Reviewed outputs, corrected phrasing and syntax, and adjusted implementation
// details to fit project requirements.

import { Router } from 'express'
import { userAuthMiddleware, userAuthAdminMiddleware } from '@relay/user-auth-backend-middleware'
import { SupplierController } from '../controllers/supplier.controller.js'

export function createSupplierRouter(controller: SupplierController) {
  const router = Router()

  // GET /api/supplier - Get all suppliers (authenticated users only)
  router.get('/', userAuthMiddleware, controller.getAllSuppliers)

  // GET /api/supplier/:id - Get single supplier (authenticated users only)
  router.get('/:id', userAuthMiddleware, controller.getSupplierById)

  // POST /api/supplier - Create supplier (admin only)
  router.post('/', userAuthAdminMiddleware, controller.createSupplier)

  // PUT /api/supplier/:id - Update supplier (admin only)
  router.put('/:id', userAuthAdminMiddleware, controller.updateSupplier)

  // DELETE /api/supplier/:id - Delete supplier (admin only)
  router.delete('/:id', userAuthAdminMiddleware, controller.deleteSupplier)

  return router
}
