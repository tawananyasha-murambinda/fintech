import { prisma } from '@/lib/prisma'
import { canonicalCategory, totalsByCategory } from '@/lib/categories'
import { currentPeriodWindow, periodProgress, type PeriodWindow } from '@/lib/budget-period'
import { sum, subtract, gt, multiply } from '@/lib/money'

// One definition of "spend against a budget", shared by the budgets screen and
// the overspend alert. They previously disagreed — the screen matched
// categories exactly, the alert by substring — so a user could see "on track"
// on one page and get an "exceeded" alert from the other.

export type BudgetStatus = {
  id: string
  category: string
  amount: number
  period: string
  spent: number
  remaining: number
  /** 0–1+; can exceed 1 when over budget. */
  used: number
  /** 0–1, how far through the period we are. */
  elapsed: number
  window: { start: string; end: string; label: string }
  isOver: boolean
  /**
   * True when spending is outpacing the period — 80% of the budget gone with
   * half the month left. This is the number worth warning about; a raw
   * percentage on day 2 says nothing.
   */
  isOnPace: boolean
  /** Spend per remaining day that would land exactly on budget. */
  safeDailySpend: number
}

function statusFor(
  budget: { id: string; category: string; amount: number; period: string },
  totals: Record<string, number>,
  window: PeriodWindow,
  now: Date
): BudgetStatus {
  const category = canonicalCategory(budget.category)
  const spent = totals[category] ?? 0
  const remaining = subtract(budget.amount, spent)
  const elapsed = periodProgress(window, now)
  const used = budget.amount > 0 ? spent / budget.amount : 0

  const msRemaining = Math.max(0, window.end.getTime() - now.getTime())
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / 86_400_000))

  return {
    id: budget.id,
    category: budget.category,
    amount: budget.amount,
    period: budget.period,
    spent,
    remaining,
    used,
    elapsed,
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      label: window.label,
    },
    // `gt` ignores sub-cent noise, so spending a budget exactly to the penny
    // is not "over".
    isOver: gt(spent, budget.amount),
    isOnPace: used > elapsed + 0.1 && used > 0.5,
    safeDailySpend: remaining > 0 ? multiply(remaining / daysRemaining, 1) : 0,
  }
}

/**
 * Every budget for a user with its spend, each measured over its own period
 * window rather than a blanket calendar month.
 */
export async function budgetStatuses(userId: string, now: Date = new Date()): Promise<BudgetStatus[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  })
  if (budgets.length === 0) return []

  // Periods in play determine how far back to read. One query covers them all.
  const windows = new Map<string, PeriodWindow>()
  for (const budget of budgets) {
    if (!windows.has(budget.period)) windows.set(budget.period, currentPeriodWindow(budget.period, now))
  }
  const earliest = new Date(Math.min(...[...windows.values()].map((w) => w.start.getTime())))

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      direction: 'debit',
      date: { gte: earliest, lt: new Date(Math.max(...[...windows.values()].map((w) => w.end.getTime()))) },
    },
    select: { amount: true, merchantCategory: true, date: true },
  })

  // Totals are computed per window, not once, because a weekly and a monthly
  // budget on the same category cover different slices of the same rows.
  const totalsByWindow = new Map<string, Record<string, number>>()
  for (const [period, window] of windows) {
    totalsByWindow.set(
      period,
      totalsByCategory(transactions.filter((t) => t.date >= window.start && t.date < window.end))
    )
  }

  return budgets.map((budget) =>
    statusFor(
      budget,
      totalsByWindow.get(budget.period) ?? {},
      windows.get(budget.period)!,
      now
    )
  )
}

/** Total committed across all budgets, normalised to a monthly figure. */
export function totalMonthlyCommitment(statuses: BudgetStatus[]): number {
  return sum(
    statuses.map((s) =>
      s.period === 'weekly' ? (s.amount * 52) / 12 : s.period === 'quarterly' ? s.amount / 3 : s.amount
    )
  )
}
