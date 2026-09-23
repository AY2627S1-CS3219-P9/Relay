import express, { type ErrorRequestHandler } from 'express'
import { UserController } from './controllers/user.controller.js'
import { prisma, UserRepository } from './repositories/user.repository.js'
import { createUserRouter } from './routes/user.routes.js'
import { MockIdentityGateway, UserService } from './services/user.service.js'
import { LocalImageStorage } from './storage/local-image-storage.js'
import { UserServiceError } from './types/user.types.js'

const repository = new UserRepository()
const imageStorage = new LocalImageStorage()
const identityGateway = new MockIdentityGateway()
const userService = new UserService(repository, imageStorage, identityGateway)
const userController = new UserController(userService)

export const app = express()

// A 5 MB binary image becomes larger when represented as a base64 data URL.
app.use(express.json({ limit: '7mb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/user', createUserRouter(userController))

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    })
    return
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'The request body contains invalid JSON.',
    })
    return
  }

  console.error(error)
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  })
}

app.use(errorHandler)

export async function closeAppResources(): Promise<void> {
  await prisma.$disconnect()
}
