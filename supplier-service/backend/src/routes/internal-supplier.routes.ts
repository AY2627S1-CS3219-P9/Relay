import { Router } from 'express'
import { SupplierController } from '../controllers/supplier.controller'

export function createInternalSupplierRouter(controller: SupplierController): Router {
  const router = Router()
  router.post('/validate-selection', controller.validateSupplierSelection)
  return router
}
