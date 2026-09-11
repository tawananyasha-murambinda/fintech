import { round, sum } from '@/lib/money'
import { classifyCadence, type Cadence } from '@/lib/subscriptions'

// Recurring income detection.
//
// The subscription detector only ever looked at debits, so the app knew what
// left on a rhythm but nothing about what arrived on one. Knowing when someone
// is next paid is what makes "safe to spend" possible at all — without a
// payday there is no window to divide the money across.
//
// Same shape of problem as subscriptions, so the same cadence classifier is
// reused rather than reimplemented.

const DAY_MS = 24 * 60 * 60 * 1000

// Payroll rarely lands on the exact same date: weekends and bank holidays push
// it around by a couple of days, so the interval test has to tolerate more
// drift than a card subscription does.
const MAX_INTERVAL_VARIANCE = 0.25

export type IncomeStream = {
  source: string
  /** The typical payment, not the average — one bonus should not move it. */
  amount: number
  cadence: Cadence
  medianGapDays: number
  lastPaid: string
  nextExpected: string | null
  paymentCount: number
  /** 0–1. Regular intervals and steady amounts raise it. */
  confidence: number
  /** True when the most recent payment differs materially from the norm. */
  amountVaries: boolean
}

export type IncomeInput = {
  merchantName: string | null
  description: string
  amount: number
  date: Date
  direction: string
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Names that are payroll even when the interval is too irregular to prove it,
// usually because there are only two payslips in the window.
const PAYROLL_HINTS =
  /payroll|salary|salaris|wages?|pay\s?run|direct dep|hr\b|paye|stipend|pension|benefit|universal credit|dwp|hmrc|social security/i

export function detectIncomeStreams(
  transactions: IncomeInput[],
  now: Date = new Date()
): { streams: IncomeStream[]; monthlyTotal: number } {
  const credits = transactions.filter((t) => t.direction === 'credit')

  const bySource = new Map<string, IncomeInput[]>()
  for (const t of credits) {
    const name = (t.merchantName || t.description || '').trim()
    if (!name) continue
    if (!bySource.has(name)) bySource.set(name, [])
    bySource.get(name)!.push(t)
  }

  const streams: IncomeStream[] = []

  for (const [source, payments] of bySource) {
    if (payments.length < 2) continue

    const sorted = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime())
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / DAY_MS)
    }

    const medianGap = median(gaps)
    const cadence = classifyCadence(medianGap)
    const isPayrollName = PAYROLL_HINTS.test(source)

    const variance =
      gaps.length > 1 && medianGap > 0
        ? median(gaps.map((g) => Math.abs(g - medianGap))) / medianGap
        : 1
    const isRegular = cadence !== 'irregular' && variance <= MAX_INTERVAL_VARIANCE

    // A named payroll source counts on two payments; anything else has to show
    // a genuine rhythm across three, so a one-off refund pair is not a salary.
    const qualifies = isPayrollName ? payments.length >= 2 : payments.length >= 3 && isRegular
    if (!qualifies) continue

    const amounts = sorted.map((p) => Math.abs(p.amount))
    const typical = round(median(amounts))
    const latest = round(amounts[amounts.length - 1])

    const effectiveCadence: Cadence =
      cadence === 'irregular' && isPayrollName ? 'monthly' : cadence

    const last = sorted[sorted.length - 1]
    const projected =
      effectiveCadence === 'irregular'
        ? null
        : new Date(last.date.getTime() + medianGap * DAY_MS)

    streams.push({
      source,
      amount: typical,
      cadence: effectiveCadence,
      medianGapDays: Math.round(medianGap),
      lastPaid: last.date.toISOString(),
      nextExpected: projected ? projected.toISOString() : null,
      paymentCount: payments.length,
      confidence: Math.min(
        1,
        (isPayrollName ? 0.45 : 0) + (isRegular ? 0.35 : 0) + Math.min(payments.length / 12, 0.2)
      ),
      // Hourly and commission work varies by design; flagged so downstream
      // projections can treat the figure as an estimate rather than a promise.
      amountVaries: amounts.length >= 3 && Math.abs(latest - typical) > typical * 0.1,
    })
  }

  streams.sort((a, b) => monthlyValue(b) - monthlyValue(a))

  return {
    streams,
    monthlyTotal: sum(streams.map(monthlyValue)),
  }
}

export function monthlyValue(stream: IncomeStream): number {
  if (stream.cadence === 'weekly') return round((stream.amount * 52) / 12)
  if (stream.cadence === 'quarterly') return round(stream.amount / 3)
  if (stream.cadence === 'yearly') return round(stream.amount / 12)
  return round(stream.amount)
}

/**
 * The next time money is expected to arrive, across all streams.
 *
 * Returns null rather than guessing when nothing recurring has been
 * established — a made-up payday would poison every number built on it.
 */
export function nextPayday(
  streams: IncomeStream[],
  now: Date = new Date()
): { date: Date; source: string; amount: number } | null {
  const upcoming = streams
    .filter((s) => s.nextExpected && s.confidence >= 0.4)
    .map((s) => ({ date: new Date(s.nextExpected!), source: s.source, amount: s.amount }))
    .filter((s) => s.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return upcoming[0] ?? null
}
