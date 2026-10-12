import { Router } from 'express'
import { ErrandController } from '../controllers/errand.controller.js'

export function createErrandRouter(controller: ErrandController): Router {
  const router = Router()

  router.post('/', controller.create)
  router.get('/', controller.list)
  router.get('/:id', controller.get)
  router.delete('/:id', controller.delete)

  return router
}
