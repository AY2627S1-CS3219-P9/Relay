const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type EstimationEnv = {
  nodeEnv: string
  port: number
  userApiUrl: string
  userServiceInternalToken: string
  timeoutMs: number
  rateLimitMax: number
  rateLimitWindowMs: number
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
    timeoutMs: positiveInteger(process.env.ESTIMATION_SERVICE_TIMEOUT_MS, 5000),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    aiProvider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    estimationTimeoutMs: parseInt(process.env.ESTIMATION_TIMEOUT_MS || '1500', 10),
  }
}
