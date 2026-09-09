import { describe, it, expect } from 'vitest'
import { computeRoundUp } from '../round-ups'

describe('computeRoundUp', () => {
  it('rounds a purchase up to the next whole unit', () => {
    expect(computeRoundUp(4.25)).toBe(0.75)
    expect(computeRoundUp(10.01)).toBe(0.99)
    expect(computeRoundUp(0.5)).toBe(0.5)
  })

  it('contributes nothing when the amount is already on the boundary', () => {
    // Rounding £4.00 up to £5.00 would take a pound the user never agreed to.
    expect(computeRoundUp(4)).toBe(0)
    expect(computeRoundUp(100)).toBe(0)
  })

  it('ignores the sign, since debits are stored either way', () => {
    expect(computeRoundUp(-4.25)).toBe(0.75)
  })

  it('honours a custom rounding step', () => {
    expect(computeRoundUp(4.25, 5)).toBe(0.75)
    expect(computeRoundUp(12.4, 5)).toBeCloseTo(2.6, 2)
    expect(computeRoundUp(10, 5)).toBe(0)
  })

  it('caps a contribution at the per-transaction maximum', () => {
    expect(computeRoundUp(1.01, 10, 2)).toBe(2)
  })

  it('does not sweep zero or invalid amounts', () => {
    expect(computeRoundUp(0)).toBe(0)
    expect(computeRoundUp(NaN)).toBe(0)
  })

  it('treats a zero step as £1 rather than dividing by zero', () => {
    expect(computeRoundUp(4.25, 0)).toBe(0.75)
  })

  it('is free of float residue', () => {
    // 0.1 % 1 in binary floating point is not exactly 0.1.
    expect(computeRoundUp(0.1)).toBe(0.9)
    expect(computeRoundUp(2.3)).toBeCloseTo(0.7, 10)
  })
})
