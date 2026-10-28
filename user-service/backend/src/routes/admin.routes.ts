import { Router } from 'express'
import { userAuthMiddleware } from '@relay/user-auth-jwt-verify'
import { adminMiddleware } from '../middleware/admin.middleware.js'
import { AdminController } from '../controllers/admin.controller.js'

export function createAdminRouter(controller: AdminController): Router {
  const router = Router()
  router.use(userAuthMiddleware, adminMiddleware)
  router.get('/admins', controller.getAdmins)
  router.post('/admin/promote', controller.promote)
  router.post('/admin/demote', controller.demote)
  return router
}
