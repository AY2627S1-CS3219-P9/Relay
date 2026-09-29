import express, { type ErrorRequestHandler } from 'express'
import { UserController } from './controllers/user.controller.js'
import { prisma, UserRepository } from './repositories/user.repository.js'
import { createUserRouter } from './routes/user.routes.js'
import {
  CognitoIdentityGateway,
  MockIdentityGateway,
  UserService,
} from './services/user.service.js'
import { getEnv } from './config/env.js'
import { LocalImageStorage } from './storage/local-image-storage.js'
import { UserServiceError } from './types/user.types.js'
import { SessionRepository } from './repositories/session.repository.js'
import { SessionService } from './services/session.service.js'
import { SessionController } from './controllers/session.controller.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { internalServiceAuth } from './middleware/internal-auth.middleware.js'
import { sessionMiddleware } from './middleware/session.middleware.js'

const repository = new UserRepository()
const imageStorage = new LocalImageStorage()
const identityGateway =
  getEnv().authMode === 'cognito' ? new CognitoIdentityGateway() : new MockIdentityGateway()
const userService = new UserService(repository, imageStorage, identityGateway)
const sessionRepository = new SessionRepository()
const userController = new UserController(userService, sessionRepository)
const sessionService = new SessionService(sessionRepository, repository)
const sessionController = new SessionController(sessionService)

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
app.use('/api/user', createAuthRouter(sessionController))
app.post(
  '/internal/user/session/validate',
  internalServiceAuth,
  sessionMiddleware,
  sessionController.validateInternalSession,
)

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    })
    return
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request body contains invalid JSON.',
      },
    })
    return
  }

  console.error(error)
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  })
}

app.use(errorHandler)

export async function closeAppResources(): Promise<void> {
  await prisma.$disconnect()
}
