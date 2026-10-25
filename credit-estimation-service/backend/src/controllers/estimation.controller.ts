import { validateEstimateRequest } from '../validators/estimation.validator'
import { estimateCredit } from '../services/estimation.service'

export async function handleEstimateCredit(request: {
  name: string
  description: string
  serviceType: number
}) {
  const { name, description, serviceType } = request

  validateEstimateRequest({ name, description, serviceType })

  return estimateCredit(name, description, serviceType)
}
