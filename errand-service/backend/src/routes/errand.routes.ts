import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

  // Keep this route before /:id so "stream" is not treated as an errand ID.
  router.get('/stream/notifications', controller.streamNotifications)
  router.post('/', controller.create)
  // List errands visible to the authenticated user
  router.get('/', controller.list)
  // List all errands for a specific supplier
  router.get('/suppliers/:supplierId/errands', controller.listBySupplier)
  // Get requestor/courier errand info (authorized - requestor/courier only)
  router.get('/:id', controller.get)
  router.delete('/:id', controller.delete)

  // Errand lifecycle endpoints
  // Accept an errand (courier only)
  router.post('/:id/accept', controller.accept)
  // Cancel an errand (requestor only)
  router.post('/:id/cancel', controller.cancel)
  // Pick up an errand (courier only)
  router.post('/:id/pickup', controller.pickUp)
  // Deliver an errand (courier only)
  router.post('/:id/deliver', controller.deliver)
  // Confirm errand delivery (requester only)
  router.post('/:id/confirm', controller.confirm)
  // Drop an errand (courier only)
  router.post('/:id/drop', controller.drop)
  return router
}
