import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'
import { CreditEstimationClient } from '../clients/credit-estimation.client.js'
import { sessionMiddleware } from '../middleware/session.middleware.js'
import { EstimateCreditRequest } from '@relay/contracts'

// Internal routes - authenticated via service token
export function createInternalErrandRouter(controller: ErrandController): Router {
  const router = Router()
  const creditEstimationClient = new CreditEstimationClient()

  router.post('/supplier-events', controller.receiveSupplierEvent)
  router.post('/supplier-view', sessionMiddleware, controller.supplierView)
  
  // Credit estimation endpoint - frontend calls this, which proxies to the estimation service
  router.post('/estimate-credit', async (req, res) => {
    const { name, description, serviceType } = req.body
    
    if (
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      typeof serviceType !== 'number'
    ) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Invalid request body. Expected name (string), description (string), serviceType (number).',
      })
      return
    }

    try {
      const request: EstimateCreditRequest = { name, description, serviceType: serviceType as any }
      const response = await creditEstimationClient.estimateCredit(request)
      res.json(response)
    } catch (error) {
      res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Credit estimation service is unavailable',
      })
    }
  })

  return router
}
