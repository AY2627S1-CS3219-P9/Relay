import { Router } from 'express'
import { CreditController } from '../controllers/credit.controller.js'
import { createSessionMiddleware } from '../middleware/session.middleware.js'
import { UserSessionService } from '../services/user-session.service.js'

export function createCreditRouter(controller: CreditController, sessions: UserSessionService) {
  const router = Router()
  router.get('/', createSessionMiddleware(sessions), controller.viewCredit)
  router.get('/history', createSessionMiddleware(sessions), controller.viewCreditHistory)
  return router
}
