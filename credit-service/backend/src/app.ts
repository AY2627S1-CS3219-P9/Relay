import express, { type ErrorRequestHandler } from 'express'
import { CreditRepository, prisma } from './repositories/credit.repository.js'
import { CreditService } from './services/credit.service.js'
import { CreditController } from './controllers/credit.controller.js'
import { UserSessionService } from './services/user-session.service.js'
import { createCreditRouter } from './routes/credit.routes.js'
import { CreditServiceError } from './types/credit.types.js'

export function createApp(
  repository = new CreditRepository(),
  sessions = new UserSessionService(),
) {
  const app = express()
  app.use(express.json())
  app.get(['/health', '/healthz'], async (_req, res) => {
    try {
      await repository.checkTables()
      res.status(200).json({ status: 'ok', database: 'ok' })
    } catch (error) {
      console.error('Credit database readiness check failed:', error)
      res.status(503).json({ status: 'unavailable', database: 'unavailable' })
    }
  })
  app.use(
    '/api/credit',
    createCreditRouter(new CreditController(new CreditService(repository)), sessions),
  )
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof CreditServiceError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message })
      return
    }
    if (error instanceof SyntaxError) {
      res
        .status(400)
        .json({ code: 'INVALID_REQUEST', message: 'The request body contains invalid JSON.' })
      return
    }
    console.error('Credit API error:', error)
    res.status(500).json({ message: 'An unexpected error occurred.' })
  }
  app.use(errorHandler)
  return app
}

export const app = createApp()

export async function closeAppResources(): Promise<void> {
  await prisma.$disconnect()
}
