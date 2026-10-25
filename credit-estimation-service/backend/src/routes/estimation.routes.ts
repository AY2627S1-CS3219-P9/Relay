import { Router, type Request, type Response } from 'express'
import { translateEstimationError } from '../types/estimation.types'
import { handleEstimateCredit } from '../controllers/estimation.controller'
import { sessionMiddleware, requireUser } from '../middleware/session.middleware'
import { checkRateLimit, getRateLimitStatus } from '../middleware/rate-limit'

const router = Router()

/**
 * Estimate credit value for an errand
 * Rate limited to 10 requests per minute per user
 */
router.post('/estimate-credit', sessionMiddleware, async (req: Request, res: Response) => {
  // Get user ID from authenticated session
  const user = requireUser(req)
  const userId = user.sub

  if (!checkRateLimit(userId, 10, 60000)) {
    const status = getRateLimitStatus(userId)
    res.status(429).json({
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded. Max 10 requests per minute. Try again in ${(status.resetTime - Date.now()) / 1000}s.`,
    })
    return
  }

  try {
    const { name, description, serviceType } = req.body

    if (
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      typeof serviceType !== 'number'
    ) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message:
          'Invalid request body. Expected name (string), description (string), serviceType (number).',
      })
      return
    }

    const result = await handleEstimateCredit({ name, description, serviceType })
    res.json(result)
  } catch (error) {
    const err = translateEstimationError(error as Error)
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    })
  }
})

export function createEstimationRouter() {
  return router
}
