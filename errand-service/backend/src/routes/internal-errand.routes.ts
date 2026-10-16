import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'

// Internal routes - authenticated via service token
export function createInternalErrandRouter(controller: ErrandController): Router {
  const router = Router()
  router.post('/supplier-events', controller.receiveSupplierEvent)
  router.post('/supplier-view', controller.supplierView)
  return router
}
