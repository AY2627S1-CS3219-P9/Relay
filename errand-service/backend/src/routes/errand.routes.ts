import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'
import { internalServiceAuth } from '../middleware/internal.middleware.js'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

  router.post('/', controller.create)
  router.get('/', controller.list)
  router.get('/:id', controller.get)
  router.delete('/:id', controller.delete)

  // Internal endpoint for supplier service notifications
  router.post(
    '/internal/errand/supplier-events',
    internalServiceAuth,
    controller.receiveSupplierEvents,
  )

  return router
}
