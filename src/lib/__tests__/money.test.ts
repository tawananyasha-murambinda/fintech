import { describe, it, expect } from 'vitest'
import { round, sum, add, subtract, multiply, eq, gt, gte, lt, lte, toNumber, toNumberOrNull } from '../money'
import { Prisma } from '@prisma/client'

describe('round', () => {
  it('kills binary-float residue', () => {
    expect(round(0.1 + 0.2)).toBe(0.3)
    expect(round(1.005)).toBe(1.01)
    expect(round(2.675)).toBe(2.68)
  })

  it('rounds away from zero symmetrically', () => {
    expect(round(-1.005)).toBe(-1.01)
    expect(round(-0.125, 2)).toBe(-0.13)
  })

  it('is a no-op on values already at 2dp', () => {
    expect(round(1234.56)).toBe(1234.56)
    expect(round(0)).toBe(0)
  })

  it('returns 0 for non-finite input rather than propagating NaN into a balance', () => {
    expect(round(NaN)).toBe(0)
    expect(round(Infinity)).toBe(0)
  })
})

describe('sum', () => {
  it('does not accumulate residue across many additions', () => {
    const cents = Array.from({ length: 1000 }, () => 0.01)
    expect(sum(cents)).toBe(10)
  })

  it('handles a realistic mixed ledger', () => {
    expect(sum([1350.0, 60.5, 45.25, 38.99, -2500.0])).toBe(-1005.26)
  })

  it('ignores non-finite entries instead of poisoning the total', () => {
    expect(sum([10, NaN, 5])).toBe(15)
  })

  it('is zero for an empty ledger', () => {
    expect(sum([])).toBe(0)
  })
})

describe('arithmetic helpers', () => {
  it('adds, subtracts and multiplies at cent precision', () => {
    expect(add(0.1, 0.2)).toBe(0.3)
    expect(subtract(0.3, 0.1)).toBe(0.2)
    expect(multiply(19.99, 3)).toBe(59.97)
  })

  it('rounds a percentage calculation to cents', () => {
    expect(multiply(1000, 0.0725)).toBe(72.5)
  })
})

describe('comparison', () => {
  it('treats a sub-cent difference as equal', () => {
    // Two computed sums that differ only by float residue are the same money.
    expect(eq(0.1 + 0.2, 0.3)).toBe(true)
    expect(gt(0.1 + 0.2, 0.3)).toBe(false)
  })

  it('still distinguishes a real cent', () => {
    expect(eq(10.0, 10.01)).toBe(false)
    expect(gt(10.01, 10.0)).toBe(true)
    expect(lt(10.0, 10.01)).toBe(true)
  })

  it('gte and lte include the equal case', () => {
    expect(gte(10.0, 10.0)).toBe(true)
    expect(lte(10.0, 10.0)).toBe(true)
    expect(gte(9.99, 10.0)).toBe(false)
  })

  it('does not report a budget as exceeded by float noise', () => {
    // The bug this exists to prevent: spending exactly the budget, computed as
    // a sum, appearing to be over it.
    const spent = sum([33.33, 33.33, 33.34])
    expect(gt(spent, 100)).toBe(false)
    expect(eq(spent, 100)).toBe(true)
  })
})

describe('toNumber', () => {
  it('unwraps a Prisma Decimal', () => {
    expect(toNumber(new Prisma.Decimal('1234.56'))).toBe(1234.56)
  })

  it('accepts the number and string forms too', () => {
    expect(toNumber(42.5)).toBe(42.5)
    expect(toNumber('42.50')).toBe(42.5)
  })

  it('collapses null to 0, and preserves it in the OrNull variant', () => {
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumberOrNull(null)).toBeNull()
    expect(toNumberOrNull(new Prisma.Decimal('7'))).toBe(7)
  })

  it('does not turn unparseable input into NaN', () => {
    expect(toNumber('not-a-number')).toBe(0)
  })
})
