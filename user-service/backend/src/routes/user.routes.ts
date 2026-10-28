import { Router } from 'express'
import { userAuthMiddleware } from '@relay/user-auth-jwt-verify'
import { UserController } from '../controllers/user.controller.js'

export function createUserRouter(controller: UserController): Router {
  const router = Router()

  router.post('/check-auth', userAuthMiddleware, controller.checkAuth)
  router.get('/me', userAuthMiddleware, controller.getUser)
  router.patch('/me', userAuthMiddleware, controller.updateUser)
  router.delete('/me', userAuthMiddleware, controller.deleteUser)

  return router
}
