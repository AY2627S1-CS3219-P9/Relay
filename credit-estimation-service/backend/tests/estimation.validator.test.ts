import { describe, expect, it } from 'vitest'
import type { EstimateCreditRequest } from '@relay/contracts'
import { validateEstimateRequest } from '../src/validators/estimation.validator'

const validRequest: EstimateCreditRequest = {
  name: 'Pick up lunch',
  description: 'Collect one meal and deliver it.',
  serviceType: 0,
  instructions: '',
  startAt: '2026-11-09T10:00:00.000Z',
  expiresAt: '2026-11-09T12:00:00.000Z',
  userId: 'user-1',
  availableCredit: 37,
}

describe('validateEstimateRequest available credit', () => {
  it('accepts zero and fractional balances', () => {
    expect(() => validateEstimateRequest({ ...validRequest, availableCredit: 0 })).not.toThrow()
    expect(() => validateEstimateRequest({ ...validRequest, availableCredit: 12.5 })).not.toThrow()
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid balance %s',
    (availableCredit) => {
      expect(() => validateEstimateRequest({ ...validRequest, availableCredit })).toThrowError(
        expect.objectContaining({
          code: 'INVALID_INPUT',
          fieldErrors: {
            availableCredit: 'Available credit must be a nonnegative number',
          },
        }),
      )
    },
  )
})
