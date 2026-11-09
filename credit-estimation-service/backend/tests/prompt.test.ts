import { describe, expect, it } from 'vitest'
import type { EstimateCreditRequest } from '@relay/contracts'
import { buildEstimationPrompt } from '../src/clients/ai.client.js'
import { getBaselineForServiceType } from '../src/config/baselines.js'

const request: EstimateCreditRequest = {
  name: 'Collect lunch',
  description: 'Collect one prepared meal and deliver it.',
  instructions: 'Keep it upright.',
  serviceType: 2,
  startAt: '2026-11-09T10:00:00.000Z',
  expiresAt: '2026-11-09T11:30:00.000Z',
  userId: 'user-1',
  availableCredit: Number.MAX_VALUE,
}

describe('buildEstimationPrompt', () => {
  it('keeps the fixed prompt compact while preserving every rule group', () => {
    const prompt = buildEstimationPrompt(request, getBaselineForServiceType(request.serviceType))
    const inputLength = JSON.stringify({
      title: request.name,
      description: request.description,
      instructions: request.instructions,
    }).length

    expect(prompt.length - inputLength).toBeLessThanOrEqual(1950)
    expect(prompt).toContain('price only if all checks pass')
    expect(prompt).toContain('a clear Shopping connection')
    expect(prompt).toContain('not override a clear mismatch')
    expect(prompt).toContain('Never invent an item/task/service connection')
    expect(prompt).toContain('repeated-character, or placeholder titles')
    expect(prompt).toContain('minCredits=maxCredits=-1')
    expect(prompt).toContain('synonyms, and minor spelling errors')
    expect(prompt).toContain('stops, size, weight, fragility, complexity')
    expect(prompt).toContain('item price/newness alone adds none')
    expect(prompt).toContain('cap maximum at balance')
    expect(prompt).toContain('if below min, preserve range')
    expect(prompt).toContain('reason mentions only factors actually used')
    expect(prompt).toContain('OUTPUT JSON only, exactly: minCredits')
    expect(prompt).toContain('No Markdown, HTML, correction suggestions, or input re-quoting')
  })
})
