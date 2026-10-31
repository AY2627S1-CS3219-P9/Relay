import { Router, type Request, type Response } from 'express'
import { translateEstimationError } from '../types/estimation.types'
import { handleEstimateCredit } from '../controllers/estimation.controller'
import { type EstimationEnv } from '../config/env.js'
import { setAIClient, createAIClient } from '../clients/ai.client'

const router = Router()
let aiClientInitialized = false

export function initializeAIClient(env: EstimationEnv): void {
  if (aiClientInitialized) {
    return
  }

  let aiClient = undefined
  if (env.aiProvider === 'openai') {
    try {
      aiClient = createAIClient({
        provider: env.aiProvider,
        endpoint: env.aiEndpoint,
        apiKey: env.aiApiKey,
        model: env.aiModel,
        temperature: env.aiTemperature,
        maxTokens: env.aiMaxTokens,
        timeoutMs: env.aiEstimationTimeoutMs,
      })
      setAIClient(aiClient)
      console.log('AI client initialized successfully')
    } catch (error) {
      console.warn('Failed to create AI client, using keyword analysis fallback:', error)
    }
  }
  aiClientInitialized = true
}

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
