import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'
import { userAuthMiddleware, userAuthSuperAdminMiddleware } from '@relay/backend-auth-middleware'
import { requireSameOrigin } from '../middleware/origin.middleware.js'
export function createAuthRouter(controller=new AuthController()):Router {
  const router=Router()
  router.post('/register',requireSameOrigin,controller.register)
  router.post('/verification/resend',requireSameOrigin,controller.resend)
  router.post('/verification/confirm-and-login',requireSameOrigin,controller.verify)
  router.post('/login',requireSameOrigin,controller.login)
  router.post('/refresh',requireSameOrigin,controller.refresh)
  router.post('/logout',requireSameOrigin,controller.logout)
  router.get('/me',userAuthMiddleware,controller.me)
  router.post('/password',requireSameOrigin,userAuthMiddleware,controller.changePassword)
  router.post('/admin/promote',requireSameOrigin,userAuthSuperAdminMiddleware,controller.promote)
  router.post('/admin/demote',requireSameOrigin,userAuthSuperAdminMiddleware,controller.demote)
  return router
}
