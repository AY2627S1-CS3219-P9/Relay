import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'
import { internalServiceAuth } from '../middleware/internal.middleware.js'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

  router.post('/', controller.create)
  router.get('/', controller.list)
  router.get('/by-supplier/:supplierId', controller.listOpenBySupplier)
  router.get('/:id', controller.get)
  router.delete('/:id', controller.delete)

  // Errand lifecycle endpoints
  router.post('/:id/accept', controller.accept)
  router.post('/:id/cancel', controller.cancel)

  // Errand lifecycle endpoints
  router.post('/:id/pickup', controller.pickUp)
  router.post('/:id/deliver', controller.deliver)
  router.post('/:id/confirm', controller.confirm)

  // Internal endpoint for supplier service notifications
  router.post(
    '/internal/errand/supplier-events',
    internalServiceAuth,
    controller.receiveSupplierEvents,
  )

  return router
}
