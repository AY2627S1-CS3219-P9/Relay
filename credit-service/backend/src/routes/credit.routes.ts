import { Router } from 'express'
import { CreditController } from '../controllers/credit.controller.js'
import { creditAuthMiddleware } from '../middleware/session.middleware.js'

export function createCreditRouter(controller: CreditController) {
  const router = Router()
  router.get('/', creditAuthMiddleware, controller.viewCredit)
  router.get('/history', creditAuthMiddleware, controller.viewCreditHistory)
  return router
}
