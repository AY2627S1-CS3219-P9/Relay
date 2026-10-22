import { Router } from 'express'
import { sessionMiddleware } from '../middleware/session.middleware.js'
import { adminMiddleware } from '../middleware/admin.middleware.js'
import { AdminController } from '../controllers/admin.controller.js'

export function createAdminRouter(controller: AdminController): Router {
  const router = Router()
  router.use(sessionMiddleware, adminMiddleware)
  router.get('/admins', controller.getAdmins)
  router.post('/admin/promote', controller.promote)
  router.post('/admin/demote', controller.demote)
  return router
}
