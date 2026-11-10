import { describe, expect, it } from 'vitest'
import {
  LONG_TIME_EXPLANATION,
  MAX_AI_REASON_LENGTH,
  MAX_REASON_LENGTH,
  SHORT_TIME_EXPLANATION,
  limitReasonAtWord,
} from '../src/config/reason'

describe('credit estimation reason limits', () => {
  it('reserves enough room for either time explanation', () => {
    expect(MAX_AI_REASON_LENGTH).toBe(102)
    expect(MAX_AI_REASON_LENGTH + 2 + SHORT_TIME_EXPLANATION.length).toBeLessThanOrEqual(
      MAX_REASON_LENGTH,
    )
    expect(MAX_AI_REASON_LENGTH + 2 + LONG_TIME_EXPLANATION.length).toBeLessThanOrEqual(
      MAX_REASON_LENGTH,
    )
  })

  it('shortens an oversized reason at a word boundary without an ellipsis', () => {
    const reason =
      'Mala hotpot with multiple protein and veggie items and noodles suggests a substantial order, warranting a moderate range.'
    const limitedReason = limitReasonAtWord(reason, MAX_AI_REASON_LENGTH)

    expect(limitedReason).toBe(
      'Mala hotpot with multiple protein and veggie items and noodles suggests a substantial order',
    )
    expect(limitedReason).not.toContain('…')
    expect(limitedReason.length).toBeLessThanOrEqual(MAX_AI_REASON_LENGTH)
  })
})
