import { Router, type Request, type Response } from 'express'
import { translateEstimationError } from '../types/estimation.types'
import { handleEstimateCredit } from '../controllers/estimation.controller'

const router = Router()

/**
 * Estimate credit value for an errand (internal only)
 * Authenticated via service token
 */
router.post('/estimate-credit', async (req: Request, res: Response) => {
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
