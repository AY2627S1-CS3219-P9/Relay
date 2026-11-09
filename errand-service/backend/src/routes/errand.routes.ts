// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT-5.6 Luna), date: 2026-10-11
// Scope: Generated initial implementation of the Errand Service routes.
// Author review: I validated correctness, edited for domain needs, and debugged as necessary.

import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

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
