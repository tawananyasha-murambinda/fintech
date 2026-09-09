// Budgets carry a `period` — weekly, monthly or quarterly — that was stored,
// shown in the UI, and then ignored: spend was always summed over the current
// calendar month. A £100 weekly budget was therefore compared against a
// month of spending and looked permanently blown, and the overspend alert only
// ever queried monthly budgets, so weekly and quarterly ones never alerted.

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly'

export const BUDGET_PERIODS: BudgetPeriod[] = ['weekly', 'monthly', 'quarterly']

export function isBudgetPeriod(value: string | null | undefined): value is BudgetPeriod {
  return value === 'weekly' || value === 'monthly' || value === 'quarterly'
}

export type PeriodWindow = { start: Date; end: Date; label: string }

/**
 * The window a budget is currently being measured over.
 *
 * Weeks start Monday. Quarters are calendar quarters. All boundaries are local
 * to the server, matching how the rest of the app builds month boundaries.
 */
export function currentPeriodWindow(
  period: string | null | undefined,
  now: Date = new Date()
): PeriodWindow {
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'weekly') {
    const day = now.getDay()
    // getDay() is 0 for Sunday; shift so Monday is the first day of the week.
    const daysSinceMonday = (day + 6) % 7
    const start = new Date(year, month, now.getDate() - daysSinceMonday)
    const end = new Date(year, month, now.getDate() - daysSinceMonday + 7)
    return { start, end, label: 'this week' }
  }

  if (period === 'quarterly') {
    const quarterStartMonth = Math.floor(month / 3) * 3
    return {
      start: new Date(year, quarterStartMonth, 1),
      end: new Date(year, quarterStartMonth + 3, 1),
      label: `Q${Math.floor(month / 3) + 1}`,
    }
  }

  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
    label: 'this month',
  }
}

/**
 * How far through the current period we are, 0–1. Lets the UI say "you are 60%
 * through the month but have spent 90% of the budget", which is the signal
 * that actually matters — a raw percentage means nothing on day 2.
 */
export function periodProgress(window: PeriodWindow, now: Date = new Date()): number {
  const total = window.end.getTime() - window.start.getTime()
  if (total <= 0) return 0
  const elapsed = now.getTime() - window.start.getTime()
  return Math.min(1, Math.max(0, elapsed / total))
}

/** Multiplier converting a period's budget into a comparable monthly figure. */
export function monthlyEquivalent(amount: number, period: string | null | undefined): number {
  if (period === 'weekly') return (amount * 52) / 12
  if (period === 'quarterly') return amount / 3
  return amount
}
