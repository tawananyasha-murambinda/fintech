import { prisma } from '@/lib/prisma'
import { canonicalCategory, totalsByCategory } from '@/lib/categories'
import { budgetStatuses } from '@/lib/budgets'
import { buildPayoffPlan, compareStrategies, type DebtInput } from '@/lib/debt'
import { detectSubscriptions } from '@/lib/subscriptions'
import { detectAnomalies } from '@/lib/anomalies'
import { netWorthTrend, computeNetWorth } from '@/lib/net-worth-history'
import { nextDueDate, daysUntilDue, monthlyEquivalent } from '@/lib/bills'
import { redactPII } from '@/lib/pii'
import { round, sum } from '@/lib/money'

// The assistant's tool surface.
//
// Previously the chat had three read-only tools over transactions and a fixed
// summary pasted into the system prompt, so it could only ever restate the
// same aggregate — and the budget context it was handed had `spent` hardcoded
// to 0, so it confidently reported every budget as untouched.
//
// Each tool here runs a real query scoped to the caller at the moment it is
// asked, which is what makes the answers specific rather than a paraphrase of
// one snapshot.

export type ToolContext = { userId: string; currency: string; now: Date }

function daysAgo(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 86_400_000)
}

/** Free text in tool output could carry PII into the provider's context. */
function scrub<T>(value: T): T {
  if (typeof value === 'string') return redactPII(value) as unknown as T
  if (Array.isArray(value)) return value.map(scrub) as unknown as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrub(v)])
    ) as T
  }
  return value
}

export const TOOL_DEFINITIONS = [
  {
    name: 'search_transactions',
    description:
      'Find individual transactions. Use when the user asks about a specific purchase, merchant, or "when did I…". Returns up to 50 rows with dates and amounts.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Merchant name or description text to match' },
        category: { type: 'string', description: 'Category name, e.g. "Food & Dining"' },
        min_amount: { type: 'number' },
        max_amount: { type: 'number' },
        direction: { type: 'string', enum: ['debit', 'credit'] },
        days_back: { type: 'number', description: 'Defaults to 90' },
        limit: { type: 'number', description: 'Defaults to 25, max 50' },
      },
    },
  },
  {
    name: 'spending_by_category',
    description:
      'Total spend per category over a window, optionally compared against the preceding window of equal length. Use for "where does my money go" and "am I spending more than before".',
    input_schema: {
      type: 'object',
      properties: {
        days_back: { type: 'number', description: 'Window length in days. Defaults to 30.' },
        compare_to_previous: { type: 'boolean', description: 'Include the preceding window' },
      },
    },
  },
  {
    name: 'cashflow_summary',
    description:
      'Income, expenses, net cashflow and savings rate over a window. Use for "can I afford", "how much do I save", "what do I earn".',
    input_schema: {
      type: 'object',
      properties: { days_back: { type: 'number', description: 'Defaults to 30' } },
    },
  },
  {
    name: 'budget_status',
    description:
      'Every budget with real spend for its own period, whether it is over, and the daily spend that would keep it on track. Use for any budget question.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'goal_progress',
    description: 'Savings goals with progress, what is left, and whether the deadline is realistic.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'upcoming_bills',
    description:
      'Bills due soon with their real next due date per frequency, plus the monthly-equivalent total.',
    input_schema: {
      type: 'object',
      properties: { days_ahead: { type: 'number', description: 'Defaults to 30' } },
    },
  },
  {
    name: 'debt_payoff',
    description:
      'Debt payoff projection across all liabilities with payment rollover. Says when each clears, total interest, and whether the payments can clear the debt at all. Use for any debt question.',
    input_schema: {
      type: 'object',
      properties: {
        extra_payment: { type: 'number', description: 'Extra per month beyond minimums' },
        strategy: { type: 'string', enum: ['avalanche', 'snowball'] },
      },
    },
  },
  {
    name: 'net_worth',
    description:
      'Current net worth broken into assets, liabilities and investments, plus the trend over time if history exists.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'subscriptions',
    description:
      'Detected recurring charges with their real cadence and monthly-equivalent cost. Use for "what am I subscribed to" and "where can I cut".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'unusual_activity',
    description:
      'Transactions that are out of character against this user own baseline — outliers, duplicate charges, large first-time merchants. Use for "anything odd", "did I get charged twice".',
    input_schema: {
      type: 'object',
      properties: { days_back: { type: 'number', description: 'Defaults to 30' } },
    },
  },
  {
    name: 'top_merchants',
    description: 'Highest-spend merchants over a window, with visit counts and averages.',
    input_schema: {
      type: 'object',
      properties: {
        days_back: { type: 'number', description: 'Defaults to 90' },
        limit: { type: 'number', description: 'Defaults to 10' },
      },
    },
  },
] as const

export type ToolName = (typeof TOOL_DEFINITIONS)[number]['name']

export async function runTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<unknown> {
  const { userId, now } = ctx

  switch (name) {
    case 'search_transactions': {
      const days = Math.min(Math.max(Number(args.days_back) || 90, 1), 730)
      const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 50)

      const rows = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: daysAgo(days, now) },
          ...(args.direction === 'debit' || args.direction === 'credit'
            ? { direction: args.direction }
            : {}),
          ...(args.category ? { merchantCategory: canonicalCategory(args.category) } : {}),
          ...(args.query
            ? {
                OR: [
                  { merchantName: { contains: String(args.query), mode: 'insensitive' as const } },
                  { description: { contains: String(args.query), mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
          date: true,
          amount: true,
          direction: true,
          merchantName: true,
          description: true,
          merchantCategory: true,
        },
      })

      const filtered = rows.filter((r) => {
        const amount = Math.abs(r.amount)
        if (args.min_amount !== undefined && amount < Number(args.min_amount)) return false
        if (args.max_amount !== undefined && amount > Number(args.max_amount)) return false
        return true
      })

      return scrub({
        count: filtered.length,
        total: sum(filtered.map((r) => Math.abs(r.amount))),
        transactions: filtered.map((r) => ({
          date: r.date.toISOString().slice(0, 10),
          amount: round(Math.abs(r.amount)),
          direction: r.direction,
          merchant: r.merchantName || r.description,
          category: canonicalCategory(r.merchantCategory),
        })),
      })
    }

    case 'spending_by_category': {
      const days = Math.min(Math.max(Number(args.days_back) || 30, 1), 730)
      const start = daysAgo(days, now)

      const current = await prisma.transaction.findMany({
        where: { userId, direction: 'debit', date: { gte: start } },
        select: { amount: true, merchantCategory: true },
      })
      const currentTotals = totalsByCategory(current)

      if (!args.compare_to_previous) {
        return scrub({
          window_days: days,
          total: sum(Object.values(currentTotals)),
          categories: Object.entries(currentTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([category, total]) => ({ category, total: round(total) })),
        })
      }

      const previous = await prisma.transaction.findMany({
        where: {
          userId,
          direction: 'debit',
          date: { gte: daysAgo(days * 2, now), lt: start },
        },
        select: { amount: true, merchantCategory: true },
      })
      const previousTotals = totalsByCategory(previous)

      const categories = [...new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)])]
        .map((category) => {
          const nowTotal = round(currentTotals[category] ?? 0)
          const thenTotal = round(previousTotals[category] ?? 0)
          return {
            category,
            total: nowTotal,
            previous_total: thenTotal,
            change: round(nowTotal - thenTotal),
            // Omitted rather than reported as infinity when there is no base.
            change_percent: thenTotal > 0 ? round(((nowTotal - thenTotal) / thenTotal) * 100) : null,
          }
        })
        .sort((a, b) => b.total - a.total)

      return scrub({
        window_days: days,
        total: sum(Object.values(currentTotals)),
        previous_total: sum(Object.values(previousTotals)),
        categories,
      })
    }

    case 'cashflow_summary': {
      const days = Math.min(Math.max(Number(args.days_back) || 30, 1), 730)
      const rows = await prisma.transaction.findMany({
        where: { userId, date: { gte: daysAgo(days, now) } },
        select: { amount: true, direction: true },
      })

      const income = sum(rows.filter((r) => r.direction === 'credit').map((r) => Math.abs(r.amount)))
      const expenses = sum(rows.filter((r) => r.direction === 'debit').map((r) => Math.abs(r.amount)))

      return scrub({
        window_days: days,
        income,
        expenses,
        net: round(income - expenses),
        savings_rate_percent: income > 0 ? round(((income - expenses) / income) * 100) : null,
        average_daily_spend: round(expenses / days),
        transaction_count: rows.length,
      })
    }

    case 'budget_status': {
      const statuses = await budgetStatuses(userId, now)
      return scrub({
        count: statuses.length,
        budgets: statuses.map((b) => ({
          category: b.category,
          period: b.period,
          window: b.window.label,
          budget: b.amount,
          spent: b.spent,
          remaining: b.remaining,
          percent_used: round(b.used * 100),
          percent_of_period_elapsed: round(b.elapsed * 100),
          is_over: b.isOver,
          spending_ahead_of_pace: b.isOnPace,
          safe_daily_spend: b.safeDailySpend,
        })),
      })
    }

    case 'goal_progress': {
      const goals = await prisma.goal.findMany({ where: { userId } })
      return scrub({
        count: goals.length,
        goals: goals.map((g) => {
          const remaining = round(g.targetAmount - g.currentAmount)
          const daysLeft = g.deadline
            ? Math.ceil((g.deadline.getTime() - now.getTime()) / 86_400_000)
            : null
          return {
            name: g.name,
            target: g.targetAmount,
            saved: g.currentAmount,
            remaining,
            percent_complete: g.targetAmount > 0 ? round((g.currentAmount / g.targetAmount) * 100) : 0,
            deadline: g.deadline?.toISOString().slice(0, 10) ?? null,
            days_remaining: daysLeft,
            required_monthly: daysLeft && daysLeft > 0 ? round((remaining / daysLeft) * 30) : null,
          }
        }),
      })
    }

    case 'upcoming_bills': {
      const daysAhead = Math.min(Math.max(Number(args.days_ahead) || 30, 1), 365)
      const bills = await prisma.bill.findMany({ where: { userId, isActive: true } })

      const projected = bills
        .map((b) => {
          const due = nextDueDate(b, now)
          return {
            name: b.name,
            amount: b.amount,
            frequency: b.frequency,
            next_due: due.toISOString().slice(0, 10),
            days_until_due: daysUntilDue(due, now),
            monthly_equivalent: monthlyEquivalent(b.amount, b.frequency),
            category: b.category,
          }
        })
        .filter((b) => b.days_until_due <= daysAhead)
        .sort((a, b) => a.days_until_due - b.days_until_due)

      return scrub({
        count: projected.length,
        due_in_window_total: sum(projected.map((b) => b.amount)),
        monthly_commitment: sum(bills.map((b) => monthlyEquivalent(b.amount, b.frequency))),
        bills: projected,
      })
    }

    case 'debt_payoff': {
      const liabilities = await prisma.liability.findMany({ where: { userId } })
      if (liabilities.length === 0) return { count: 0, message: 'No liabilities recorded.' }

      const debts: DebtInput[] = liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        balance: l.balance,
        interestRate: l.interestRate,
        minPayment: l.minPayment,
      }))

      const extra = Math.max(Number(args.extra_payment) || 0, 0)
      const strategy = args.strategy === 'snowball' ? 'snowball' : 'avalanche'
      const plan = buildPayoffPlan(debts, extra, strategy)
      const comparison = compareStrategies(debts, extra)

      if (!plan.feasible) {
        return scrub({
          feasible: false,
          // The important case: these payments never clear the debt, and the
          // assistant must say so rather than quote a payoff date.
          reason: 'Minimum payments do not cover the interest being charged.',
          shortfalls: plan.neverPaidOff,
          total_balance: sum(debts.map((d) => d.balance)),
        })
      }

      return scrub({
        feasible: true,
        strategy,
        extra_payment: extra,
        months_to_debt_free: plan.months,
        total_interest: plan.totalInterest,
        total_paid: plan.totalPaid,
        clearing_order: plan.perDebt
          .slice()
          .sort((a, b) => a.clearedInMonth - b.clearedInMonth)
          .map((d) => ({
            name: d.name,
            balance: d.balance,
            clears_in_month: d.clearedInMonth,
            interest_paid: d.interestPaid,
          })),
        cheaper_strategy: comparison.cheaper,
        interest_difference_between_strategies: comparison.interestDifference,
      })
    }

    case 'net_worth': {
      const [components, trend] = await Promise.all([computeNetWorth(userId), netWorthTrend(userId)])
      return scrub({
        ...components,
        trend: {
          data_points: trend.points.length,
          change_over_period: trend.change,
          change_percent: trend.changePercent,
          average_monthly_change: trend.monthlyRate,
          period_days: trend.periodDays,
        },
      })
    }

    case 'subscriptions': {
      const rows = await prisma.transaction.findMany({
        where: { userId, direction: 'debit', date: { gte: daysAgo(400, now) } },
        select: {
          merchantName: true,
          description: true,
          merchantCategory: true,
          amount: true,
          date: true,
        },
        take: 3000,
      })
      const result = detectSubscriptions(rows, now)
      return scrub({
        count: result.subscriptions.length,
        total_monthly: result.totalMonthly,
        total_yearly: result.totalYearly,
        subscriptions: result.subscriptions.map((s) => ({
          name: s.name,
          charge: s.amount,
          cadence: s.cadence,
          monthly_equivalent: s.monthlyAmount,
          last_charge: s.lastCharge.slice(0, 10),
          next_expected: s.nextExpected?.slice(0, 10) ?? null,
          price_changed_recently: s.priceChanged,
        })),
      })
    }

    case 'unusual_activity': {
      const days = Math.min(Math.max(Number(args.days_back) || 30, 1), 180)
      const baseline = await prisma.transaction.findMany({
        where: { userId, direction: 'debit', date: { gte: daysAgo(Math.max(days, 90), now) } },
        select: {
          id: true,
          date: true,
          amount: true,
          merchantName: true,
          description: true,
          merchantCategory: true,
        },
        take: 2000,
      })
      const cutoff = daysAgo(days, now)
      const anomalies = detectAnomalies(
        baseline.filter((t) => t.date >= cutoff),
        baseline
      )

      return scrub({
        count: anomalies.length,
        findings: anomalies.slice(0, 15).map((a) => ({
          type: a.type,
          severity: a.severity,
          merchant: a.merchant,
          amount: a.amount,
          explanation: a.message,
        })),
      })
    }

    case 'top_merchants': {
      const days = Math.min(Math.max(Number(args.days_back) || 90, 1), 730)
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30)

      const rows = await prisma.transaction.findMany({
        where: { userId, direction: 'debit', date: { gte: daysAgo(days, now) } },
        select: { merchantName: true, description: true, amount: true, merchantCategory: true },
        take: 3000,
      })

      const byMerchant = new Map<string, { total: number; count: number; category: string }>()
      for (const r of rows) {
        const name = (r.merchantName || r.description || 'Unknown').trim()
        const entry = byMerchant.get(name) ?? {
          total: 0,
          count: 0,
          category: canonicalCategory(r.merchantCategory),
        }
        entry.total += Math.abs(r.amount)
        entry.count++
        byMerchant.set(name, entry)
      }

      return scrub({
        window_days: days,
        merchants: [...byMerchant.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, limit)
          .map(([name, d]) => ({
            merchant: name,
            total: round(d.total),
            visits: d.count,
            average: round(d.total / d.count),
            category: d.category,
          })),
      })
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
