import { describe, it, expect } from 'vitest'
import { rows, opening, closing, trough } from '../../../scripts/seed-demo-bank.mjs'
import type { SeededRow } from '../../../scripts/seed-demo-bank.mjs'
import { detectSubscriptions } from '@/lib/subscriptions'
import { detectIncomeStreams } from '@/lib/recurring-income'
import { detectAnomalies } from '@/lib/anomalies'
import { CATEGORIES } from '@/lib/categories'

// The seed exists so the AI surfaces can be tested against something. That is
// only true if the detectors actually find things in it — a year of data that
// trips none of them is a year of data that proves nothing.
//
// These assertions are about the *generator*, not the database: they run with
// no connection and no Prisma client.

type Row = SeededRow

const year: Row[] = rows

const asSubscriptionInput = year
  .filter((r) => r.direction === 'debit')
  .map((r) => ({
    merchantName: r.merchantName,
    description: r.description,
    merchantCategory: r.merchantCategory,
    amount: r.amount,
    date: r.date,
  }))

describe('the generated year', () => {
  it('covers twelve months at a believable daily volume', () => {
    expect(year.length).toBeGreaterThan(900)

    const days = new Set(year.map((r) => r.date.toISOString().slice(0, 10)))
    expect(days.size).toBeGreaterThan(300)

    const span = (year[year.length - 1].date.getTime() - year[0].date.getTime()) / 86_400_000
    expect(span).toBeGreaterThan(350)
    expect(span).toBeLessThanOrEqual(366)
  })

  it('never lets the account go overdrawn', () => {
    // A negative balance would make safe-to-spend and the cashflow chart
    // nonsense, and nothing downstream would flag it as unrealistic.
    expect(trough).toBeGreaterThan(0)
    expect(Math.min(...year.map((r) => r.runningBalance))).toBeGreaterThan(0)
  })

  it('keeps the running balance consistent with the transactions', () => {
    const net = year.reduce((s, r) => s + (r.direction === 'credit' ? r.amount : -r.amount), 0)
    expect(closing).toBeCloseTo(opening + net, 1)
  })

  it('only uses categories the rest of the app understands', () => {
    // The bug this guards: three disagreeing category vocabularies meant every
    // budget read zero. Seeded data must speak the canonical one.
    const used = new Set(year.map((r) => r.merchantCategory))
    for (const category of used) {
      expect(CATEGORIES, `${category} is not a canonical category`).toContain(category)
    }
    expect(used.size).toBeGreaterThanOrEqual(10)
  })

  it('leaves the most recent days still settling', () => {
    expect(year.some((r) => r.status === 'pending')).toBe(true)
  })
})

describe('what the detectors find in it', () => {
  it('recognises the salary as a monthly income stream', () => {
    const { streams, monthlyTotal } = detectIncomeStreams(
      year.map((r) => ({
        merchantName: r.merchantName,
        description: r.description,
        amount: r.amount,
        date: r.date,
        direction: r.direction,
      }))
    )

    const salary = streams.find((s) => /Salaris/i.test(s.source))
    expect(salary, 'the salary should be detected').toBeTruthy()
    expect(salary!.cadence).toBe('monthly')
    expect(salary!.amount).toBeGreaterThan(2400)
    expect(salary!.confidence).toBeGreaterThan(0.5)

    // Student finance ran for the first half of the year and stopped.
    expect(streams.some((s) => /DUO/i.test(s.source))).toBe(true)
    expect(monthlyTotal).toBeGreaterThan(0)
  })

  it('does not mistake irregular bar shifts for a salary', () => {
    const { streams } = detectIncomeStreams(
      year.map((r) => ({
        merchantName: r.merchantName,
        description: r.description,
        amount: r.amount,
        date: r.date,
        direction: r.direction,
      }))
    )

    const bar = streams.find((s) => /De Kelder/i.test(s.source))
    if (bar) expect(bar.cadence).not.toBe('monthly')
  })

  it('finds the subscriptions, at their real cadences', () => {
    const { subscriptions, totalMonthly } = detectSubscriptions(asSubscriptionInput)
    const byName = (n: string) => subscriptions.find((s) => s.name === n)

    expect(byName('Netflix')).toBeTruthy()
    expect(byName('Spotify')).toBeTruthy()
    expect(byName('Swapfiets')).toBeTruthy()
    expect(totalMonthly).toBeGreaterThan(50)

    // A non-monthly charge must be reported as a month's worth of cost, not a
    // month's charge — the bug where a quarterly bill read at its full value.
    const water = byName('Evides Waterbedrijf')
    expect(water?.cadence).toBe('quarterly')
    expect(water!.monthlyAmount).toBeCloseTo(water!.amount / 3, 1)

    // The yearly Amazon Prime renewal bills once inside the window, so it
    // correctly is not called recurring on one data point.
    expect(byName('Amazon Prime')).toBeUndefined()
  })

  it('flags the Netflix price rise', () => {
    const { subscriptions } = detectSubscriptions(asSubscriptionInput)
    const netflix = subscriptions.find((s) => s.name === 'Netflix')

    expect(netflix?.priceChanged).toBe(true)
    expect(netflix!.priceChangeMonthly).toBeGreaterThan(0)
  })

  it('flags the cancelled gym as dormant', () => {
    const { subscriptions } = detectSubscriptions(asSubscriptionInput)
    const gym = subscriptions.find((s) => s.name === 'Basic-Fit')

    expect(gym, 'the gym should still be detected from its earlier charges').toBeTruthy()
    expect(gym!.dormant).toBe(true)
    expect(gym!.daysSinceLastCharge).toBeGreaterThan(60)
  })

  it('surfaces the planted outliers as unusual', () => {
    const scored = year
      .filter((r) => r.direction === 'debit')
      .map((r, i) => ({
        id: `t${i}`,
        date: r.date,
        amount: r.amount,
        description: r.description,
        merchantName: r.merchantName,
        merchantCategory: r.merchantCategory,
      }))

    // Scored the way the app does it: a recent window judged against the year
    // behind it.
    const cutoff = Date.now() - 90 * 86_400_000
    const recent = scored.filter((t) => t.date.getTime() >= cutoff)

    const anomalies = detectAnomalies(recent as never, scored as never)
    expect(anomalies.length).toBeGreaterThan(0)

    // The summer trip and the festival both sit in the recent window and are
    // several times the median for their categories.
    const found = anomalies.map((a) => JSON.stringify(a)).join(' ')
    expect(found).toMatch(/Ryanair|Booking|Ticketmaster/)
  })
})

describe('the story the year tells', () => {
  const before = year.filter((r) => r.date < new Date(new Date().getFullYear(), 2, 1))
  const after = year.filter((r) => r.date >= new Date(new Date().getFullYear(), 2, 1))

  it('shows income rising after graduation', () => {
    const monthlyIncome = (rs: Row[]) => {
      const total = rs.filter((r) => r.direction === 'credit').reduce((s, r) => s + r.amount, 0)
      const months = new Set(rs.map((r) => r.date.toISOString().slice(0, 7))).size
      return months ? total / months : 0
    }

    // There has to be a change for the comparison tools to have anything to
    // report; a flat year makes every trend insight vacuous.
    expect(monthlyIncome(after)).toBeGreaterThan(monthlyIncome(before) * 1.5)
  })

  it('shows dining out rising with the income', () => {
    const dining = (rs: Row[]) => {
      const total = rs
        .filter((r) => r.merchantCategory === 'Food & Dining')
        .reduce((s, r) => s + r.amount, 0)
      const months = new Set(rs.map((r) => r.date.toISOString().slice(0, 7))).size
      return months ? total / months : 0
    }

    expect(dining(after)).toBeGreaterThan(dining(before))
  })
})
