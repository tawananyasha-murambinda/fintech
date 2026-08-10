import type { CashflowPoint, SpendingCategory } from '@/types'

// Deterministic, believable demo figures used on the marketing page and empty
// states. Values are generated from a seeded PRNG keyed by day-of-month, so the
// numbers are realistic per category AND identical between the server and client
// renders (avoids hydration mismatches that `Math.random()` caused).
//
// The profile is a single young professional in the US: ~$4,840/mo net income,
// a $1,350 apartment, weekly groceries, biweekly paychecks, and the usual mix of
// subscriptions, transport and the occasional weekend splurge.

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Realistic per-category monthly totals for the "where your money goes" preview.
// `percentage` is derived from the total so the pie always adds up to 100%.
export const DEMO_CATEGORIES: SpendingCategory[] = (() => {
  const rows: { category: string; total: number }[] = [
    { category: 'Rent & Housing', total: 1350 },
    { category: 'Groceries', total: 425 },
    { category: 'Dining Out', total: 315 },
    { category: 'Transport', total: 165 },
    { category: 'Bills & Utilities', total: 240 },
    { category: 'Subscriptions', total: 55 },
    { category: 'Entertainment', total: 85 },
    { category: 'Shopping', total: 225 },
    { category: 'Coffee Shops', total: 92 },
    { category: 'Health & Fitness', total: 58 },
  ]
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  return rows.map((r) => ({
    category: r.category,
    total: r.total,
    count: 0,
    percentage: (r.total / grandTotal) * 100,
    trend: 0,
    transactions: [],
  }))
})()

// A believable 30-day income/outflow series ending today: biweekly paychecks,
// a weekly grocery run, rent/utilities/phone on fixed days, subscriptions, and
// weekend spend that ticks up. Deterministic per calendar day.
export function buildDemoCashflow(): CashflowPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const points: CashflowPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const dom = d.getDate()
    const weekday = d.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    const rand = mulberry32(dom * 101 + weekday * 7 + 13)

    const isPayday = dom === 1 || dom === 15
    const income = isPayday ? Math.round(2380 + rand() * 90) : 0

    let expenses: number
    if (dom === 1) expenses = 1350 + 40 + 12 // rent + transit pass
    else if (dom === 5) expenses = 118 + 62 // electric + internet
    else if (dom === 20) expenses = 62 + 16 // phone + cloud
    else if (dom === 9) expenses = 55 // subscriptions
    else if (dom === 22) expenses = 185 + Math.round(rand() * 40) // weekend trip
    else if (dom % 7 === 4) expenses = 95 + Math.round(rand() * 20) // weekly groceries
    else if (isWeekend) expenses = 48 + Math.round(rand() * 34) // weekend out
    else expenses = 24 + Math.round(rand() * 18) // weekday coffee + commute

    // Occasional evening out on random midweek days.
    if (!isWeekend && rand() > 0.72) expenses += 18 + Math.round(rand() * 28)

    points.push({
      date: d.toISOString().split('T')[0],
      income,
      expenses: Math.round(expenses),
      net: income - Math.round(expenses),
    })
  }
  return points
}

// A handful of recent, realistic transactions for demo transaction lists.
export const DEMO_TRANSACTIONS = [
  { id: 'demo-1', merchantName: 'Whole Foods Market', merchantCategory: 'Groceries', amount: 86.42, direction: 'debit', date: '2026-08-07T09:12:00.000Z', status: 'posted' },
  { id: 'demo-2', merchantName: 'Blue Bottle Coffee', merchantCategory: 'Coffee Shops', amount: 7.25, direction: 'debit', date: '2026-08-07T13:45:00.000Z', status: 'posted' },
  { id: 'demo-3', merchantName: 'Shell', merchantCategory: 'Gas & Fuel', amount: 42.1, direction: 'debit', date: '2026-08-06T08:03:00.000Z', status: 'posted' },
  { id: 'demo-4', merchantName: 'Terra Mediterranean Grill', merchantCategory: 'Dining Out', amount: 34.8, direction: 'debit', date: '2026-08-05T19:22:00.000Z', status: 'posted' },
  { id: 'demo-5', merchantName: 'Netflix', merchantCategory: 'Subscriptions', amount: 15.49, direction: 'debit', date: '2026-08-04T03:00:00.000Z', status: 'posted' },
  { id: 'demo-6', merchantName: 'Acme Corp Payroll', merchantCategory: 'Income', amount: 2420.0, direction: 'credit', date: '2026-08-01T08:00:00.000Z', status: 'posted' },
] as const
