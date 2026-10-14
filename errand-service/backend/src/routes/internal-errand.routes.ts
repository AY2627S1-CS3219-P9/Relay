import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'

export function createInternalErrandRouter(controller: ErrandController): Router {
  const router = Router()
  router.post('/supplier-view', controller.supplierView)
  return router
}
