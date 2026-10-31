const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const positiveIntegerOptional = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type EstimationEnv = {
  nodeEnv: string
  port: number
  userApiUrl: string
  userServiceInternalToken: string
  internalServiceToken: string
  timeoutMs: number
  aiProvider: string
  aiApiKey: string
  aiModel: string
  aiEndpoint: string
  aiTemperature?: number
  aiMaxTokens?: number
  aiEstimationTimeoutMs: number
}

export function getEnv(): EstimationEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: positiveInteger(process.env.PORT, 3005),
    userApiUrl: process.env.USER_API_URL ?? 'http://user-api:3000',
    userServiceInternalToken: process.env.USER_SERVICE_INTERNAL_TOKEN ?? '',
    internalServiceToken: process.env.CREDIT_ESTIMATION_SERVICE_TOKEN ?? '',
    timeoutMs: positiveInteger(process.env.ESTIMATION_SERVICE_TIMEOUT_MS, 5000),
    aiProvider: process.env.AI_PROVIDER || '',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || '',
    aiEndpoint: process.env.AI_ENDPOINT || '',
    aiTemperature: positiveIntegerOptional(process.env.AI_TEMPERATURE, 0),
    aiMaxTokens: positiveIntegerOptional(process.env.AI_MAX_TOKENS, 500),
    aiEstimationTimeoutMs: positiveInteger(process.env.AI_ESTIMATION_TIMEOUT_MS, 1500),
  }
}
