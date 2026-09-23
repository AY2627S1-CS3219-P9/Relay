import { Router } from 'express'
import { cognitoAuthMiddleware } from '../middleware/cognito-auth.middleware.js'
import { UserController } from '../controllers/user.controller.js'

export function createUserRouter(controller: UserController): Router {
  const router = Router()

  router.use(cognitoAuthMiddleware)
  router.get('/me', controller.getUser)
  router.patch('/me', controller.updateUser)
  router.delete('/me', controller.deleteUser)

  return router
}
