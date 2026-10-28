import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware.js'
import { requireSameOrigin } from '../middleware/origin.middleware.js'
export function createAuthRouter(controller=new AuthController()):Router {
  const router=Router()
  router.get('/.well-known/jwks.json',controller.keys)
  router.post('/register',requireSameOrigin,controller.register)
  router.post('/verification/resend',requireSameOrigin,controller.resend)
  router.post('/verification/confirm-and-login',requireSameOrigin,controller.verify)
  router.post('/login',requireSameOrigin,controller.login)
  router.post('/refresh',requireSameOrigin,controller.refresh)
  router.post('/logout',requireSameOrigin,controller.logout)
  router.get('/me',requireAuth,controller.me)
  router.post('/password',requireSameOrigin,requireAuth,controller.changePassword)
  router.post('/admin/promote',requireSameOrigin,requireAuth,requireSuperAdmin,controller.promote)
  router.post('/admin/demote',requireSameOrigin,requireAuth,requireSuperAdmin,controller.demote)
  return router
}
