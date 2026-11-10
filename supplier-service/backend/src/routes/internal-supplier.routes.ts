import { Router } from 'express'
import { SupplierController } from '../controllers/supplier.controller.js'

export function createInternalSupplierRouter(controller: SupplierController): Router {
  const router = Router()
  router.post('/validate-selection', controller.validateSupplierSelection)
  return router
}
