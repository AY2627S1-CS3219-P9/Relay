import { getEnv } from '../config/env'

export const AI_CONFIG = {
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  temperature: 0,
  maxTokens: 500,
} as const

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
  private apiKey: string
  private model: string
  private timeout: number

  constructor() {
    const env = getEnv()
    this.apiKey = env.openaiApiKey
    this.model = env.openaiModel
    this.timeout = env.estimationTimeoutMs
  }

  async estimateCredit(
    name: string,
    description: string,
    baseline: { base: number; min: number; max: number; name: string },
  ): Promise<{ estimatedCredits: number; explanation: string }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

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
    return `You are a credit estimation assistant for an errand platform.

Your task is to analyze the errand details and return a JSON object with a credit estimate.

SERVICE TYPE INFORMATION:
- Name: ${baseline.name}
- Baseline credit: ${baseline.base}
- Acceptable range: ${baseline.min} to ${baseline.max} credits

ERRAND DETAILS:
Title: "${name}"
Description: "${description}"

INSTRUCTIONS:
1. Analyze the errand for complexity based on keywords and requirements
2. Return a JSON object with exactly these fields:
   - estimatedCredits: integer between ${baseline.min} and ${baseline.max} (inclusive)
   - explanation: brief reasoning (max 50 words)
3. Do not include any other fields or text
4. Base your estimate on: service type baseline, title complexity, description complexity

OUTPUT FORMAT (JSON ONLY):
{
  "estimatedCredits": 15,
  "explanation": "Brief reasoning for the estimate."
}

Now return your estimate:`
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a credit estimation assistant.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0,
          max_tokens: 500,
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

      let estimatedCredits = Math.round(data.estimatedCredits)
      estimatedCredits = Math.max(baseline.min, Math.min(baseline.max, estimatedCredits))

      const explanation = data.explanation.substring(0, 500)

      return { estimatedCredits, explanation }
    } catch (error) {
      throw new Error('Failed to parse AI response')
    }
  }
}

export function createAIClient(): AIClient {
  const config = getEnv()

  switch (config.aiProvider) {
    case 'openai':
      return new OpenAIClient()
    default:
      throw new Error(`Unknown AI provider: ${config.aiProvider}`)
  }
}
