import { describe, it, expect } from 'vitest'
import { detectIncomeStreams, nextPayday, monthlyValue } from '../recurring-income'

const NOW = new Date('2026-06-15T00:00:00Z')

function payments(source: string, amount: number, gapDays: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    merchantName: source,
    description: source,
    amount,
    direction: 'credit',
    date: new Date(NOW.getTime() - (count - 1 - i) * gapDays * 86_400_000),
  }))
}


/** The same payments, but ending `agoDays` before NOW instead of at it. */
function endedPayments(source: string, amount: number, gapDays: number, count: number, agoDays: number) {
  return payments(source, amount, gapDays, count).map((p) => ({
    ...p,
    date: new Date(p.date.getTime() - agoDays * 86_400_000),
  }))
}

describe('detectIncomeStreams', () => {
  it('finds a monthly salary', () => {
    const { streams } = detectIncomeStreams(payments('Acme Corp Payroll', 2400, 30, 6), NOW)

    expect(streams).toHaveLength(1)
    expect(streams[0].cadence).toBe('monthly')
    expect(streams[0].amount).toBe(2400)
    expect(streams[0].nextExpected).not.toBeNull()
  })

  it('ignores debits entirely', () => {
    const spending = payments('Tesco', 40, 7, 8).map((p) => ({ ...p, direction: 'debit' }))
    expect(detectIncomeStreams(spending, NOW).streams).toHaveLength(0)
  })

  it('trusts a payroll name on only two payments', () => {
    expect(detectIncomeStreams(payments('Monthly Salary', 3000, 30, 2), NOW).streams).toHaveLength(1)
  })

  it('does not call two random refunds an income stream', () => {
    const refunds = [
      { merchantName: 'Amazon', description: 'refund', amount: 30, direction: 'credit', date: new Date('2026-05-02') },
      { merchantName: 'Amazon', description: 'refund', amount: 30, direction: 'credit', date: new Date('2026-06-11') },
    ]
    expect(detectIncomeStreams(refunds, NOW).streams).toHaveLength(0)
  })

  it('tolerates payday drifting around weekends', () => {
    // 28, 31, 29, 30 day gaps — a real payroll, not a clockwork one.
    const dates = [0, 28, 59, 88, 118].map((d) => new Date(NOW.getTime() - (118 - d) * 86_400_000))
    const stream = dates.map((date) => ({
      merchantName: 'Globex Payroll',
      description: 'Globex Payroll',
      amount: 2200,
      direction: 'credit',
      date,
    }))

    const { streams } = detectIncomeStreams(stream, NOW)
    expect(streams[0].cadence).toBe('monthly')
  })

  it('flags income that varies rather than presenting it as fixed', () => {
    const varied = payments('Freelance Client', 1000, 30, 5)
    varied[varied.length - 1].amount = 2500

    const { streams } = detectIncomeStreams(varied, NOW)
    expect(streams[0].amountVaries).toBe(true)
  })

  it('normalises weekly pay into a monthly total', () => {
    const { monthlyTotal } = detectIncomeStreams(payments('Weekly Wages', 500, 7, 10), NOW)
    expect(monthlyTotal).toBeCloseTo((500 * 52) / 12, 0)
  })
})

describe('monthlyValue', () => {
  it('converts each cadence onto a month', () => {
    const base = { source: 'x', medianGapDays: 30, lastPaid: '', nextExpected: null, paymentCount: 3, confidence: 1, amountVaries: false, ended: false, daysSinceLastPaid: 0 }
    expect(monthlyValue({ ...base, amount: 1200, cadence: 'yearly' })).toBe(100)
    expect(monthlyValue({ ...base, amount: 300, cadence: 'quarterly' })).toBe(100)
    expect(monthlyValue({ ...base, amount: 100, cadence: 'monthly' })).toBe(100)
  })
})

describe('nextPayday', () => {
  it('returns the soonest confident upcoming payment', () => {
    const { streams } = detectIncomeStreams(
      [...payments('Acme Payroll', 2400, 30, 6), ...payments('Side Gig Salary', 400, 30, 4)],
      NOW
    )
    const payday = nextPayday(streams, NOW)

    expect(payday).not.toBeNull()
    expect(payday!.date.getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('returns null rather than inventing a payday', () => {
    // Everything built on safe-to-spend depends on this not guessing.
    expect(nextPayday([], NOW)).toBeNull()
  })
})

describe('detectIncomeStreams, continued', () => {
  // Found by the seeded test year: a student grant and an internship stipend
  // that both stopped in March were still being counted as income in
  // September, and still projecting a "next payment" six months in the past.
  describe('income that has stopped', () => {
    it('marks a stream that has not paid in well over a cycle as ended', () => {
      const { streams } = detectIncomeStreams(
        endedPayments('DUO Studiefinanciering', 314.53, 30, 6, 150),
        NOW
      )

      expect(streams).toHaveLength(1)
      expect(streams[0].ended).toBe(true)
      expect(streams[0].daysSinceLastPaid).toBeGreaterThan(60)
    })

    it('does not project a payday that has already passed', () => {
      const { streams } = detectIncomeStreams(
        endedPayments('Acme Corp Payroll', 2400, 30, 6, 150),
        NOW
      )

      expect(streams[0].nextExpected).toBeNull()
    })

    it('leaves ended income out of the monthly total', () => {
      const live = payments('Acme Corp Payroll', 2400, 30, 6)
      const dead = endedPayments('Old Job Salary', 1800, 30, 6, 150)

      const { streams, monthlyTotal } = detectIncomeStreams([...live, ...dead], NOW)

      // Both remain visible — the history is worth showing — but only the
      // money still arriving is counted.
      expect(streams).toHaveLength(2)
      expect(monthlyTotal).toBeCloseTo(2400, 0)
    })

    it('still counts a stream that is merely a few days late', () => {
      const { streams, monthlyTotal } = detectIncomeStreams(
        endedPayments('Acme Corp Payroll', 2400, 30, 6, 12),
        NOW
      )

      expect(streams[0].ended).toBe(false)
      expect(monthlyTotal).toBeCloseTo(2400, 0)
    })
  })
})
