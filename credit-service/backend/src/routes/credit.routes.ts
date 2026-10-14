import { Router } from 'express'
import { CreditController } from '../controllers/credit.controller.js'
import { createSessionMiddleware } from '../middleware/session.middleware.js'
import { UserSessionService } from '../services/user-session.service.js'

export function createCreditRouter(controller: CreditController, sessions: UserSessionService) {
  const router = Router()
  router.use(createSessionMiddleware(sessions))
  router.get('/', controller.viewCredit)
  router.get('/history', controller.viewCreditHistory)
  router.post('/reserve', controller.reserveCredit)
  return router
}
