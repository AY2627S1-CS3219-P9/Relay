import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'
import { CreditEstimationClient } from '../clients/credit-estimation.client.js'
import { EstimateCreditRequest, ServiceType } from '@relay/contracts'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

  router.post('/', controller.create)

  router.post('/estimate-credit', async (req, res) => {
    const { name, description, serviceType, instructions, startAt, expiresAt } = req.body

    if (
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      typeof serviceType !== 'number' ||
      typeof instructions !== 'string' ||
      typeof startAt !== 'string' ||
      typeof expiresAt !== 'string' ||
      !Object.values(ServiceType).includes(serviceType)
    ) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Invalid credit estimation request.',
      })
      return
    }

    const request: EstimateCreditRequest = {
      name,
      description,
      serviceType,
      instructions,
      startAt,
      expiresAt,
    }
    const response = await new CreditEstimationClient().estimateCredit(request)
    res.json(response)
  })

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
