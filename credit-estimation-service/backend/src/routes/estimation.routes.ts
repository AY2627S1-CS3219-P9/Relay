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
        rateLimitRequestsPerMinute: env.aiRateLimitRequestsPerMinute,
      })
      setAIClient(aiClient)
      console.log('AI client initialized successfully')
    } catch (error) {
      console.warn('Failed to create AI client:', error)
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
    const { name, description, serviceType, instructions, startAt, expiresAt } = req.body

    const result = await handleEstimateCredit({
      name,
      description,
      serviceType,
      instructions,
      startAt,
      expiresAt,
    })
    res.json(result)
  } catch (error) {
    const err = translateEstimationError(error as Error)
    res.status(err.statusCode).json({
      code: err.code,
        message: err.fieldErrors
          ? `${err.message} ${Object.entries(err.fieldErrors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(' ')}`
          : err.message,
    })
  }
})

export function createEstimationRouter() {
  return router
}
