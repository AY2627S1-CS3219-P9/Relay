import { EstimateCreditRequest, EstimateCreditResponse } from '@relay/contracts'
import { RateLimiterFactory } from './rateLimiter.factory.js'
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
  fallbackRateLimitRequestsPerMinute: number
  redisUrl: string
}

export interface AIClient {
  estimateCredit(
    request: EstimateCreditRequest,
    baseline: ServiceTypeBaseline,
  ): Promise<EstimateCreditResponse>
  rateLimiter: {
    tryAcquire(key?: string): Promise<boolean> | boolean
  }
}

export class OpenAIClient implements AIClient {
  private config: AIConfig
  public rateLimiter: {
    tryAcquire(key?: string): Promise<boolean> | boolean
  }

  constructor(config: AIConfig) {
    this.config = config
    this.rateLimiter = RateLimiterFactory.create({
      redisUrl: config.redisUrl,
      windowMs: 60 * 1000,
      maxRequests: config.rateLimitRequestsPerMinute,
      fallbackMaxRequests: config.fallbackRateLimitRequestsPerMinute,
    })
  }

  async estimateCredit(
    request: EstimateCreditRequest,
    baseline: ServiceTypeBaseline,
  ): Promise<EstimateCreditResponse> {
    const prompt = this.buildPrompt(request, baseline)

    try {
      // Fail fast rate limit check (supports both sync and async)
      // Use user-specific key (userId is mandatory)
      const rateLimitKey = `user:${request.userId}:api_requests`
      const allowed = await this.rateLimiter.tryAcquire(rateLimitKey)
      if (!allowed) {
        console.warn(`Rate limit exceeded for user ${request.userId}`)
        throw new Error('RATE_LIMITED')
      }

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
    return `
      Validate and estimate credits for an errand.

      Service: ${baseline.name}
      Baseline: ${baseline.base}
      Global range: 10-50
      Available credit balance: ${Math.floor(request.availableCredit)}
      Input: ${JSON.stringify({ title: request.name, description: request.description, instructions: request.instructions })}

      VALIDATE BEFORE PRICING:
      Validation is a hard gate. Do not estimate credits until all checks pass.
      The title and description must together:
      1. Identify a specific, meaningful item or an actionable errand task.
      2. Establish a clear connection to the selected service (${baseline.name}).
      3. Provide enough information to understand what is being collected or delivered.
      4. Be consistent with each other.

      The description may clarify an ambiguous title, but cannot override
      a clear mismatch. Missing optional details are acceptable only after
      the core item or task is clear.
      Do not invent an item, task, or service connection.
      Do not assume relevance from the selected service alone.
      Reject vague, meaningless, repeated-character, or placeholder titles
      unless the description clearly identifies a real item or actionable task.
      If any check fails, or relevance cannot be established confidently, return -1.
      Never use the baseline as a fallback for invalid input.

      PRICE ONLY VALID REQUESTS:
      - Read both name and description for pricing factors.
      - Recognize ordinary language, synonyms, and minor spelling mistakes;
        do not require exact keywords.
      - Apply only semantic factors stated in the input, including stops, size,
        weight, fragility, and complexity.
      - A brief description can still express a pricing factor.
      - Use the service baseline as the center of the suggested range.
      - Adjust around that baseline for applicable semantic factors; do not
        replace the baseline with a generic global value.
      - Treat the available credit balance as an affordability limit. A
        larger balance must never increase the estimated value.
      - If the available balance can cover the minimum but not the
        maximum, cap the maximum at the available balance.
      - If the available balance is below the minimum, preserve the
        range; the user interface will warn that the minimum is unaffordable.
      - If an additional factor applies, the upper end should normally exceed
        the baseline unless the global maximum is reached.
      - Keep the result within the global 10-50 bounds.
      - Never invent factors. Item price or newness alone adds no credits.
      - The reason must reflect only the factors used in the estimate.

      Return JSON only with exactly:
      - minCredits: integer from 10 to 50, or -1 if invalid.
      - maxCredits: integer from 10 to 50, or -1 if invalid.
      - reason: one direct, friendly, user-facing sentence, maximum ${MAX_AI_REASON_LENGTH} characters.
      Vary the sentence structure. Do not mention AI, prompts, models, or internal rules.
      No markdown, HTML, correction suggestions, or re-quoting of input.
    `
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
