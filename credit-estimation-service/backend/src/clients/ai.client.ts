export interface AIConfig {
  provider: string
  endpoint: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
  timeoutMs: number
}

export interface AIClient {
  estimateCredit(
    name: string,
    description: string,
    baseline: {
      base: number
      min: number
      max: number
      name: string
    },
  ): Promise<{ estimatedCredits: number; explanation: string }>
}

export class OpenAIClient implements AIClient {
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  async estimateCredit(
    name: string,
    description: string,
    baseline: { base: number; min: number; max: number; name: string },
  ): Promise<{ estimatedCredits: number; explanation: string }> {
    const prompt = this.buildPrompt(name, description, baseline)

    try {
      const response = await this.callOpenAI(prompt)

      return this.parseResponse(response, baseline)
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw error
    }
  }

  private buildPrompt(
    name: string,
    description: string,
    baseline: { base: number; min: number; max: number; name: string },
  ): string {
    return `
      Validate and estimate credits for an errand.

      Service: ${baseline.name}
      Baseline: ${baseline.base}
      Range: ${baseline.min}-${baseline.max}
      Input: ${JSON.stringify({ title: name, description })}

      VALIDATE BEFORE PRICING:
      The title and description must:
      1. Identify a meaningful task or item.
      2. Establish relevance to the selected service.
      3. Be consistent with each other.

      The description may clarify an ambiguous title, but cannot override
      a clear mismatch. Missing optional details are acceptable.
      Do not invent actions, reinterpret unrelated content, or assume
      relevance from the selected service alone.
      If any check fails or relevance cannot be established, return -1.
      Never use the baseline as a fallback for invalid input.

      PRICE ONLY VALID REQUESTS:
      - Read both title and description for pricing factors.
      - Recognize ordinary language, synonyms, and minor spelling mistakes;
        do not require exact keywords.
      - Apply stated urgency, distance, stops, size, weight, fragility,
        complexity, and environmental difficulty.
      - A brief description can still express a pricing factor.
      - Start at baseline and increase proportionally to applicable factors.
      - If an additional factor applies, credits must exceed baseline,
        unless baseline already equals the maximum.
      - Use baseline only when no additional factors are expressed.
      - Never invent factors. Item price or newness alone adds no credits.
      - The explanation must reflect the factors used in the estimate.

      Return JSON only with exactly:
      - estimatedCredits: integer within range, or -1 if invalid.
      - explanation: maximum 12 words; main pricing reason or brief issue label.
      No correction suggestions. No re-quoting of input.
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
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
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

  private parseResponse(
    response: string,
    baseline: { min: number; max: number },
  ): { estimatedCredits: number; explanation: string } {
    try {
      const data = JSON.parse(response)

      if (typeof data.estimatedCredits !== 'number' || typeof data.explanation !== 'string') {
        throw new Error('Invalid response format')
      }

      // Check for invalid request marker
      if (data.estimatedCredits === -1) {
        return { estimatedCredits: -1, explanation: data.explanation.substring(0, 500) }
      }

      let estimatedCredits = Math.round(data.estimatedCredits)
      estimatedCredits = Math.max(baseline.min, Math.min(baseline.max, estimatedCredits))

      const explanation = data.explanation.substring(0, 500)

      return { estimatedCredits, explanation }
    } catch (error) {
      throw new Error('Failed to parse AI response')
    }
  }
}

export function createAIClient(config: AIConfig): AIClient {
  return new OpenAIClient(config)
}

let aiClient: AIClient | undefined

export function setAIClient(client: AIClient | undefined): void {
  aiClient = client
}

export function getAIClient(): AIClient | undefined {
  return aiClient
}
