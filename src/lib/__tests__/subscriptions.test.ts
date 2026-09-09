import { describe, it, expect } from 'vitest'
import { detectSubscriptions, classifyCadence, monthlyEquivalent } from '../subscriptions'

const NOW = new Date('2026-06-15T00:00:00Z')

function charges(name: string, amount: number, gapDays: number, count: number, category = 'ENTERTAINMENT') {
  return Array.from({ length: count }, (_, i) => ({
    merchantName: name,
    description: name,
    merchantCategory: category,
    amount: -amount,
    date: new Date(NOW.getTime() - (count - 1 - i) * gapDays * 86_400_000),
  }))
}

describe('classifyCadence', () => {
  it('names the standard billing rhythms', () => {
    expect(classifyCadence(7)).toBe('weekly')
    expect(classifyCadence(30)).toBe('monthly')
    expect(classifyCadence(91)).toBe('quarterly')
    expect(classifyCadence(365)).toBe('yearly')
    expect(classifyCadence(17)).toBe('irregular')
  })
})

describe('monthlyEquivalent', () => {
  it('normalises a yearly charge to a twelfth', () => {
    // The old detector reported a £120 yearly plan as £120 a month and summed
    // that into the headline total.
    expect(monthlyEquivalent(120, 'yearly')).toBe(10)
    expect(monthlyEquivalent(30, 'quarterly')).toBe(10)
    expect(monthlyEquivalent(10, 'weekly')).toBeCloseTo(43.33, 1)
  })
})

describe('detectSubscriptions', () => {
  it('detects a monthly subscription and reports its real charge', () => {
    const { subscriptions, totalMonthly } = detectSubscriptions(charges('Netflix', 9.99, 30, 6), NOW)

    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].cadence).toBe('monthly')
    // Not rounded to £10 — the old version rounded to whole units.
    expect(subscriptions[0].amount).toBe(9.99)
    expect(totalMonthly).toBe(9.99)
  })

  it('normalises a yearly subscription into the monthly total', () => {
    const { subscriptions, totalMonthly } = detectSubscriptions(charges('Adobe', 120, 365, 3), NOW)

    expect(subscriptions[0].cadence).toBe('yearly')
    expect(subscriptions[0].amount).toBe(120)
    expect(subscriptions[0].monthlyAmount).toBe(10)
    expect(totalMonthly).toBe(10)
  })

  it('does not call two same-priced coffees a subscription', () => {
    // The old heuristic flagged any merchant charged twice at the same amount.
    const coffees = [
      { merchantName: 'Corner Cafe', description: 'Corner Cafe', merchantCategory: 'FOOD_AND_DRINK', amount: -3.5, date: new Date('2026-06-02') },
      { merchantName: 'Corner Cafe', description: 'Corner Cafe', merchantCategory: 'FOOD_AND_DRINK', amount: -3.5, date: new Date('2026-06-09') },
    ]

    expect(detectSubscriptions(coffees, NOW).subscriptions).toHaveLength(0)
  })

  it('ignores irregular repeat visits even at three-plus charges', () => {
    const visits = [1, 4, 19, 22].map((day) => ({
      merchantName: 'Local Shop',
      description: 'Local Shop',
      merchantCategory: 'GENERAL_MERCHANDISE',
      amount: -12,
      date: new Date(`2026-06-0${day < 10 ? day : ''}${day >= 10 ? day : ''}`),
    }))

    expect(detectSubscriptions(visits, NOW).subscriptions).toHaveLength(0)
  })

  it('trusts a known provider on only two charges', () => {
    expect(detectSubscriptions(charges('Spotify', 11.99, 30, 2), NOW).subscriptions).toHaveLength(1)
  })

  it('flags a price change on an established subscription', () => {
    const history = charges('Netflix', 9.99, 30, 5)
    history[history.length - 1].amount = -12.99

    const [sub] = detectSubscriptions(history, NOW).subscriptions
    expect(sub.priceChanged).toBe(true)
  })

  it('projects the next expected charge', () => {
    const [sub] = detectSubscriptions(charges('Netflix', 9.99, 30, 6), NOW).subscriptions
    expect(sub.nextExpected).not.toBeNull()
    expect(new Date(sub.nextExpected!).getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('normalises the category', () => {
    const [sub] = detectSubscriptions(charges('Netflix', 9.99, 30, 6, 'ENTERTAINMENT'), NOW).subscriptions
    expect(sub.category).toBe('Entertainment')
  })

  it('reports a yearly total consistent with the monthly one', () => {
    const result = detectSubscriptions(
      [...charges('Netflix', 9.99, 30, 6), ...charges('Adobe', 120, 365, 3)],
      NOW
    )
    expect(result.totalYearly).toBeCloseTo(result.totalMonthly * 12, 2)
  })
})
