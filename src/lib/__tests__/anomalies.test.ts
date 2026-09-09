import { describe, it, expect } from 'vitest'
import { detectAnomalies, type ScoredTransaction } from '../anomalies'

let seq = 0
const tx = (
  merchantName: string,
  amount: number,
  daysAgo = 1,
  merchantCategory = 'FOOD_AND_DRINK'
): ScoredTransaction => ({
  id: `t${seq++}`,
  date: new Date(Date.now() - daysAgo * 86_400_000),
  amount: -amount,
  merchantName,
  description: merchantName,
  merchantCategory,
})

/** Twelve unremarkable lunches, so there is a baseline to be unusual against. */
function ordinaryHistory(): ScoredTransaction[] {
  return Array.from({ length: 12 }, (_, i) => tx('Corner Cafe', 10 + (i % 3), 10 + i))
}

describe('detectAnomalies', () => {
  it('says nothing without enough history to know what normal is', () => {
    const thin = [tx('Corner Cafe', 10), tx('Corner Cafe', 500)]
    expect(detectAnomalies(thin, thin)).toEqual([])
  })

  it('flags a charge far outside the category baseline', () => {
    const history = ordinaryHistory()
    const outlier = tx('Fancy Restaurant', 400, 1)
    const found = detectAnomalies([outlier], [...history, outlier])

    expect(found.length).toBeGreaterThan(0)
    expect(found[0].transactionId).toBe(outlier.id)
  })

  it('does not flag an ordinary charge', () => {
    const history = ordinaryHistory()
    const normal = tx('Corner Cafe', 11, 1)
    const found = detectAnomalies([normal], [...history, normal])

    expect(found).toEqual([])
  })

  it('is relative to the person, not an absolute threshold', () => {
    // Someone whose lunches cost £200 should not be warned about a £220 one.
    const bigSpender = Array.from({ length: 12 }, (_, i) => tx('Nobu', 200 + i, 10 + i))
    const normalForThem = tx('Nobu', 220, 1)

    expect(detectAnomalies([normalForThem], [...bigSpender, normalForThem])).toEqual([])
  })

  it('flags a large charge at a merchant never seen before', () => {
    const history = ordinaryHistory()
    const stranger = tx('Unknown Vendor Ltd', 900, 1, 'GENERAL_MERCHANDISE')
    const found = detectAnomalies([stranger], [...history, stranger])

    expect(found.some((a) => a.type === 'new_merchant_large')).toBe(true)
  })

  it('flags the duplicate, not the original', () => {
    const history = ordinaryHistory()
    const first = tx('Corner Cafe', 42, 1)
    const second = { ...tx('Corner Cafe', 42, 1), date: first.date }

    const found = detectAnomalies([first, second], [...history, first, second])
    const dupes = found.filter((a) => a.type === 'duplicate_charge')

    expect(dupes).toHaveLength(1)
    expect(dupes[0].transactionId).toBe(second.id)
  })

  it('does not treat two different amounts on one day as a duplicate', () => {
    const history = ordinaryHistory()
    const a = tx('Corner Cafe', 12, 1)
    const b = { ...tx('Corner Cafe', 13, 1), date: a.date }

    const found = detectAnomalies([a, b], [...history, a, b])
    expect(found.filter((x) => x.type === 'duplicate_charge')).toHaveLength(0)
  })

  it('survives a history where every charge is identical', () => {
    // A zero spread would divide by zero in a naive implementation.
    const identical = Array.from({ length: 12 }, (_, i) => tx('Subscription Co', 9.99, 10 + i))
    const spike = tx('Subscription Co', 99.9, 1)

    const found = detectAnomalies([spike], [...identical, spike])
    expect(found.length).toBeGreaterThan(0)
  })

  it('ranks critical findings above warnings', () => {
    const history = ordinaryHistory()
    const huge = tx('Fancy Restaurant', 900, 1)
    const big = tx('Bistro', 60, 1)

    const found = detectAnomalies([huge, big], [...history, huge, big])
    if (found.length >= 2) {
      const rank = { critical: 0, warning: 1, info: 2 }
      expect(rank[found[0].severity]).toBeLessThanOrEqual(rank[found[1].severity])
    }
  })

  it('never flags the same transaction twice', () => {
    const history = ordinaryHistory()
    const weird = tx('Brand New Vendor', 800, 1)

    const found = detectAnomalies([weird], [...history, weird])
    expect(new Set(found.map((a) => a.transactionId)).size).toBe(found.length)
  })
})
