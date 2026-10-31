import type { EstimateCreditRequest, EstimateCreditResponse } from '@relay/contracts'
import { getEnv } from '../config/env.js'

export class CreditEstimationClient {
  async estimateCredit(request: EstimateCreditRequest): Promise<EstimateCreditResponse> {
    const env = getEnv()
    let response: Response

    try {
      response = await fetch(`${env.creditEstimationApiUrl}/internal/estimation/estimate-credit`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-credit-estimation-service-token': env.creditEstimationServiceToken,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(env.estimationTimeoutMs),
      })
    } catch {
      throw new Error('Credit estimation is unavailable')
    }

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Credit estimation API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    return data as EstimateCreditResponse
  }
}
