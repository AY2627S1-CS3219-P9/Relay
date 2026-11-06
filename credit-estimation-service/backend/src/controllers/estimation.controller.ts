import { validateEstimateRequest } from '../validators/estimation.validator'
import { estimateCredit } from '../services/estimation.service'
import { EstimateCreditRequest, EstimateCreditResponse } from '@relay/contracts'

export async function handleEstimateCredit(
  request: EstimateCreditRequest,
): Promise<EstimateCreditResponse> {
  const { name, description, serviceType, instructions, startAt, expiresAt } = request

  validateEstimateRequest({ name, description, serviceType, instructions, startAt, expiresAt })

  return estimateCredit({ name, description, serviceType, instructions, startAt, expiresAt })
}
