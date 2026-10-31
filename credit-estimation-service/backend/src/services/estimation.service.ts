import type { EstimateCreditResponse } from '@relay/contracts'
import { analyzeKeywords, generateExplanation } from '../utils/keyword-analyzer'
import { getAIClient } from '../clients/ai.client'
import { getBaselineForServiceType } from '../config/baselines'

export async function estimateCredit(
  name: string,
  description: string,
  serviceType: number,
): Promise<EstimateCreditResponse> {
  const baseline = getBaselineForServiceType(serviceType)

  const aiClient = getAIClient()

  try {
    if (aiClient) {
      const aiResult = await aiClient.estimateCredit(name, description, baseline)

      // Return error response for invalid requests
      if (aiResult.estimatedCredits === -1) {
        return {
          estimatedCredits: -1,
          explanation: aiResult.explanation,
        }
      }

      return {
        estimatedCredits: aiResult.estimatedCredits,
        explanation: aiResult.explanation,
      }
    }
  } catch (error) {
    console.warn('AI estimation failed, using keyword analysis fallback:', error)
  }

  const analysis = analyzeKeywords(name, description)

  // Calculate estimated credits: baseline + complexity adjustment
  // Complexity score is 0-10, we map it to +/- 10 credits
  const complexityAdjustment = (analysis.complexityScore - 5) * 2
  let estimatedCredits = baseline.base + complexityAdjustment

  estimatedCredits = Math.max(baseline.min, Math.min(baseline.max, estimatedCredits))
  estimatedCredits = Math.round(estimatedCredits)

  const explanation = generateExplanation(baseline, analysis)

  return {
    estimatedCredits,
    explanation,
  }
}
