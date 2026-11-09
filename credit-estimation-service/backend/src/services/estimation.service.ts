import type { EstimateCreditRequest, EstimateCreditResponse } from '@relay/contracts'
import { CreditEstimationErrors } from '@relay/contracts'
import { getAIClient } from '../clients/ai.client'
import { getBaselineForServiceType } from '../config/baselines'
import { EstimationServiceError } from '../types/estimation.types'

export async function estimateCredit(
  request: EstimateCreditRequest,
): Promise<EstimateCreditResponse> {
  const baseline = getBaselineForServiceType(request.serviceType)

  const aiClient = getAIClient()
  if (!aiClient) {
    throw new EstimationServiceError(
      CreditEstimationErrors.SERVICE_UNAVAILABLE,
      'Credit estimation service is unavailable.',
      503,
    )
  }

  try {
    const aiResult = await aiClient.estimateCredit(request, baseline)

    if (aiResult.minCredits === -1 || aiResult.maxCredits === -1) {
      return {
        minCredits: -1,
        maxCredits: -1,
        reason: aiResult.reason,
      }
    }

    // Ensure the estimated range is within the available credit balance
    const availableWholeCredits = Math.floor(request.availableCredit)
    if (
      availableWholeCredits >= aiResult.minCredits &&
      availableWholeCredits < aiResult.maxCredits
    ) {
      return { ...aiResult, maxCredits: availableWholeCredits }
    }

    return aiResult
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      throw new EstimationServiceError(
        CreditEstimationErrors.RATE_LIMITED,
        'Credit estimation is temporarily rate limited.',
        429,
      )
    }

    console.warn('AI estimation failed:', error)
    throw new EstimationServiceError(
      CreditEstimationErrors.SERVICE_UNAVAILABLE,
      'Credit estimation service is unavailable.',
      503,
    )
  }
}
