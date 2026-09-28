import { Router } from 'express'
import { cognitoAuthMiddleware } from '../middleware/cognito-auth.middleware.js'
import { sessionMiddleware } from '../middleware/session.middleware.js'
import { UserController } from '../controllers/user.controller.js'

export function createUserRouter(controller: UserController): Router {
  const router = Router()

  router.post('/check-auth', cognitoAuthMiddleware, controller.checkAuth)
  router.get('/me', sessionMiddleware, controller.getUser)
  router.patch('/me', sessionMiddleware, controller.updateUser)
  router.delete('/me', sessionMiddleware, controller.deleteUser)

  return router
}
