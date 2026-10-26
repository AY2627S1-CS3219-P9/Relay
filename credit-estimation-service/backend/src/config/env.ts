const positiveInteger = (value: string | undefined, fallback: number): number => {
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
  openaiApiKey: string
  openaiModel: string
  estimationTimeoutMs: number
}

export function getEnv(): EstimationEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: positiveInteger(process.env.PORT, 3005),
    userApiUrl: process.env.USER_API_URL ?? 'http://user-api:3000',
    userServiceInternalToken:
      process.env.USER_SERVICE_INTERNAL_TOKEN ?? 'local-internal-user-service-token',
    internalServiceToken: process.env.CREDIT_ESTIMATION_SERVICE_TOKEN ?? 'local-internal-estimation-service-token',
    timeoutMs: positiveInteger(process.env.ESTIMATION_SERVICE_TIMEOUT_MS, 5000),
    aiProvider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    estimationTimeoutMs: parseInt(process.env.ESTIMATION_TIMEOUT_MS || '1500', 10),
  }
}
