import { EstimateCreditRequest, EstimateCreditResponse } from '@relay/contracts'
import { RateLimiterFactory, type RateLimiter } from './rateLimiter.factory.js'
import { ServiceTypeBaseline } from '../config/baselines.js'
import { MAX_AI_REASON_LENGTH, limitReasonAtWord } from '../config/reason.js'

export interface AIConfig {
  provider: string
  endpoint: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
  timeoutMs: number
  rateLimitRequestsPerMinute: number
  globalRateLimitRequestsPerMinute: number
  redisUrl: string
}

export interface AIClient {
  estimateCredit(
    request: EstimateCreditRequest,
    baseline: ServiceTypeBaseline,
  ): Promise<EstimateCreditResponse>
  rateLimiter: {
    tryAcquire(userId: string): unknown
    disconnect?(): Promise<void>
  }
}

export function buildEstimationPrompt(
  request: EstimateCreditRequest,
  baseline: ServiceTypeBaseline,
): string {
  return [
    'TASK: Validate first; price only if all checks pass.',
    `CONTEXT: service=${baseline.name}; baseline=${baseline.base}; range=10-50; balance=${Math.floor(request.availableCredit)}.`,
    `INPUT: ${JSON.stringify({ title: request.name, description: request.description, instructions: request.instructions })}`,
    `VALIDATE title+description jointly. Require: (1) a specific meaningful item/actionable task; (2) a clear ${baseline.name} connection; (3) enough detail to know what is collected/delivered; (4) mutual consistency.`,
    'Description may clarify ambiguity, not override a clear mismatch. Optional details may be missing only if the core item/task is clear.',
    'Never invent an item/task/service connection or infer relevance from service selection alone.',
    'Reject vague, meaningless, repeated-character, or placeholder titles unless description identifies a real item/actionable task.',
    'On any failure or uncertain relevance: minCredits=maxCredits=-1; baseline is never an invalid-input fallback.',
    'PRICE valid input only, reading title+description. Accept ordinary wording, synonyms, and minor spelling errors; exact keywords are unnecessary.',
    'Use only stated semantic factors (including stops, size, weight, fragility, complexity); a brief description may establish one. Never invent factors; item price/newness alone adds none.',
    'Center range on service baseline and adjust for applicable factors, never substitute a generic global value. An additional factor normally puts the upper end above baseline unless 50 is reached.',
    'Balance is affordability-only: more balance never raises the estimate. If it covers min not max, cap maximum at balance; if below min, preserve range (UI warns that minimum is unaffordable).',
    'Both credits must stay within 10-50; reason mentions only factors actually used.',
    `OUTPUT JSON only, exactly: minCredits=integer 10-50 or -1 if invalid; maxCredits=integer 10-50 or -1 if invalid; reason=one direct, friendly, user-facing sentence of at most ${MAX_AI_REASON_LENGTH} characters.`,
    'Vary sentence structure. Never mention AI, prompts, models, or internal rules. No Markdown, HTML, correction suggestions, or input re-quoting.',
  ].join('\n')
}

export class OpenAIClient implements AIClient {
  private config: AIConfig
  public rateLimiter: RateLimiter

  constructor(config: AIConfig) {
    this.config = config
    this.rateLimiter = RateLimiterFactory.create({
      redisUrl: config.redisUrl,
      windowMs: 60 * 1000,
      perUserMaxRequests: config.rateLimitRequestsPerMinute,
      globalMaxRequests: config.globalRateLimitRequestsPerMinute,
    })
  }

  async estimateCredit(
    request: EstimateCreditRequest,
    baseline: ServiceTypeBaseline,
  ): Promise<EstimateCreditResponse> {
    try {
      const rateLimit = await this.rateLimiter.tryAcquire(request.userId)
      if (!rateLimit.allowed) {
        console.warn('Credit estimation rate limit exceeded', {
          scope: rateLimit.scope,
          retryAfterMs: rateLimit.retryAfterMs,
        })
        throw new Error('RATE_LIMITED')
      }

      const prompt = this.buildPrompt(request, baseline)
      const response = await this.callOpenAI(prompt)

      return this.parseResponse(response)
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        throw error
      }
      console.error('OpenAI API error:', error)
      throw error
    }
  }

  private buildPrompt(request: EstimateCreditRequest, baseline: ServiceTypeBaseline): string {
    return buildEstimationPrompt(request, baseline)
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: 'You are a credit estimation assistant.' },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature ?? 0,
          max_tokens: this.config.maxTokens ?? 500,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        console.error(
          `OpenAI API error response (${response.status}):`,
          errorData.substring(0, 500),
        )
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/json')) {
        const bodyText = await response.text()
        console.error(`Non-JSON response (${contentType}):`, bodyText.substring(0, 500))
        throw new Error(`Expected JSON, got ${contentType}`)
      }

      const data = await response.json()

      return data.choices[0].message.content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI API timeout')
      }
      throw error
    }
  }

  private parseResponse(response: string): {
    minCredits: number
    maxCredits: number
    reason: string
  } {
    try {
      const data = JSON.parse(response)

      if (
        typeof data.minCredits !== 'number' ||
        typeof data.maxCredits !== 'number' ||
        typeof data.reason !== 'string'
      ) {
        throw new Error('Invalid response format')
      }

      if (data.minCredits === -1 || data.maxCredits === -1) {
        return { minCredits: -1, maxCredits: -1, reason: data.reason.substring(0, 160) }
      }

      const minCredits = Math.round(data.minCredits)
      const maxCredits = Math.round(data.maxCredits)
      if (minCredits < 10 || maxCredits > 50 || minCredits > maxCredits) {
        throw new Error('AI response range is outside global bounds')
      }

      const normalizedReason = data.reason
        .replace(/[<>]/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
      const reason = limitReasonAtWord(normalizedReason, MAX_AI_REASON_LENGTH)
      if (!reason || /[`*_#]/.test(reason)) {
        throw new Error('AI response reason is not user-facing text')
      }

      return { minCredits, maxCredits, reason }
    } catch (error) {
      throw new Error('Failed to parse AI response')
    }
  }
}

export function createAIClient(config: AIConfig): AIClient {
  return new OpenAIClient(config)
}

let aiClientInstance: AIClient | null = null

export function getAIClient(): AIClient | null {
  return aiClientInstance
}

export function setAIClient(client: AIClient | null): void {
  aiClientInstance = client
}

export async function cleanupAIClient(): Promise<void> {
  if (aiClientInstance && 'rateLimiter' in aiClientInstance) {
    const client = aiClientInstance as OpenAIClient
    const rateLimiter = client.rateLimiter as { disconnect?(): Promise<void> }
    if (typeof rateLimiter.disconnect === 'function') {
      await rateLimiter.disconnect()
    }
  }
  aiClientInstance = null
}
