import { afterEach, describe, expect, it } from 'vitest'
import { setAIClient } from '../src/clients/ai.client'
import { estimateCredit } from '../src/services/estimation.service'

afterEach(() => setAIClient(undefined))

describe('estimateCredit', () => {
  it('returns service unavailable when AI is not configured', async () => {
    await expect(
      estimateCredit({
        name: 'Pick up lunch',
        description: 'Collect one meal and deliver it.',
        serviceType: 0,
      }),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    })
  })

  it('passes the expanded request to the AI client', async () => {
    const received: unknown[] = []
    setAIClient({
      estimateCredit: async (...args) => {
        received.push(args)
        return { minCredits: 20, maxCredits: 28, reason: 'The short deadline raises the suggested range.' }
      },
    })

    const result = await estimateCredit({
      name: 'Deliver notes',
      description: 'Please deliver these before class.',
      serviceType: 1,
      instructions: 'Call when downstairs.',
      startAt: '2026-11-06T10:00:00.000Z',
      expiresAt: '2026-11-06T10:30:00.000Z',
    })

    expect(result).toEqual({
      minCredits: 20,
      maxCredits: 28,
      reason: 'The short deadline raises the suggested range.',
    })
    expect(received[0]).toEqual([
      {
        name: 'Deliver notes',
        description: 'Please deliver these before class.',
        serviceType: 1,
        instructions: 'Call when downstairs.',
        startAt: '2026-11-06T10:00:00.000Z',
        expiresAt: '2026-11-06T10:30:00.000Z',
      },
      expect.objectContaining({ name: 'Drink' }),
    ])
  })
})
