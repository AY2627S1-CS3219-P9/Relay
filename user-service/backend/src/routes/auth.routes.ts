import { Router } from 'express'
import { sessionMiddleware } from '../middleware/session.middleware.js'
import { SessionController } from '../controllers/session.controller.js'

export function createAuthRouter(controller: SessionController): Router {
  const router = Router()
  router.post('/auth/register', controller.register)
  router.post('/auth/verification/resend', controller.resendVerification)
  router.post('/auth/verification/confirm-and-login', controller.confirmAndLogin)
  router.post('/auth/login', controller.login)
  router.post('/auth/logout', controller.logout)
  router.get('/session', sessionMiddleware, controller.getSession)
  router.post('/auth/password', sessionMiddleware, controller.changePassword)
  return router
}
