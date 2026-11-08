import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'
import { CreditEstimationClient } from '../clients/credit-estimation.client.js'
import { sessionMiddleware, requireUser } from '../middleware/session.middleware.js'
import { EstimateCreditRequest, ServiceType } from '@relay/contracts'

// Internal routes - authenticated via service token
export function createInternalErrandRouter(controller: ErrandController): Router {
  const router = Router()
  const creditEstimationClient = new CreditEstimationClient()

  router.post('/supplier-events', controller.receiveSupplierEvent)
  router.post('/supplier-view', sessionMiddleware, controller.supplierView)

  // Credit estimation endpoint - frontend calls this, which proxies to the estimation service
  router.post('/estimate-credit', async (req, res) => {
    const { name, description, serviceType, instructions, startAt, expiresAt } = req.body
    const user = requireUser(req)

    if (
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      typeof serviceType !== 'number' ||
      typeof instructions !== 'string' ||
      typeof startAt !== 'string' ||
      typeof expiresAt !== 'string'
    ) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message:
          'Invalid request body. Expected name, description, serviceType, instructions, startAt, and expiresAt.',
      })
      return
    }

    if (!Object.values(ServiceType).includes(serviceType)) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Invalid service type.',
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
      userId: user.sub,
    }
    const response = await creditEstimationClient.estimateCredit(request)
    res.json(response)
  })

  return router
}
