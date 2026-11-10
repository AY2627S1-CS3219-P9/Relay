// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT-5.6 Luna), date: 2026-10-14
// Scope: Generated initial implementation, debugged implementation
// Author review: I validated correctness and edited for style.


import { Router } from 'express'
import { CreditController } from '../controllers/credit.controller.js'
import { creditAuthMiddleware } from '../middleware/session.middleware.js'

export function createCreditRouter(controller: CreditController) {
  const router = Router()
  router.get('/', creditAuthMiddleware, controller.viewCredit)
  router.get('/history', creditAuthMiddleware, controller.viewCreditHistory)
  return router
}
