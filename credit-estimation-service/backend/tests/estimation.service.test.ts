import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAIClient, cleanupAIClient } from '../src/clients/ai.client'
import { estimateCredit } from '../src/services/estimation.service'

afterEach(async () => {
  vi.restoreAllMocks()
  await cleanupAIClient()
})

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

  it('passes the request and service baseline to the AI client', async () => {
    const received: unknown[] = []
    setAIClient({
      estimateCredit: async (...args) => {
        received.push(args)
        return {
          minCredits: 20,
          maxCredits: 28,
          reason: 'The short deadline raises the suggested range.',
        }
      },
      rateLimiter: { tryAcquire: () => true },
    })

    const result = await estimateCredit({
      name: 'Deliver notes',
      description: 'Please deliver these before class.',
      serviceType: 1, // Drink service
      instructions: 'Call when downstairs.',
      startAt: '2026-11-06T10:00:00.000Z',
      expiresAt: '2026-11-06T10:30:00.000Z',
    })

    expect(result).toEqual({
      minCredits: 20,
      maxCredits: 28,
      reason: 'The short deadline raises the suggested range.',
    })

    // Verify the request and baseline are passed to the AI client
    expect(received[0]).toMatchObject([
      {
        name: 'Deliver notes',
        description: 'Please deliver these before class.',
        serviceType: 1,
        instructions: 'Call when downstairs.',
        startAt: '2026-11-06T10:00:00.000Z',
        expiresAt: '2026-11-06T10:30:00.000Z',
      },
      {
        base: 10, // Drink baseline
        min: 8,
        max: 20,
        name: 'Drink',
      },
    ])
  })

  it('returns rate limited error when AI client throws rate limit error', async () => {
    setAIClient({
      estimateCredit: async () => {
        throw new Error('RATE_LIMITED')
      },
      rateLimiter: { tryAcquire: () => true },
    })

    await expect(
      estimateCredit({
        name: 'Test task',
        description: 'Test description',
        serviceType: 0,
      }),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      statusCode: 429,
    })
  })

  it('returns service unavailable when AI client throws generic error', async () => {
    setAIClient({
      estimateCredit: async () => {
        throw new Error('Unknown error')
      },
      rateLimiter: { tryAcquire: () => true },
    })

    await expect(
      estimateCredit({
        name: 'Test task',
        description: 'Test description',
        serviceType: 0,
      }),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    })
  })
})
