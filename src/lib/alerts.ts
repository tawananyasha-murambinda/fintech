import { prisma } from '@/lib/prisma'
import { sum, gt, multiply } from '@/lib/money'
import { canonicalCategory } from '@/lib/categories'
import { budgetStatuses } from '@/lib/budgets'
import { detectAnomalies } from '@/lib/anomalies'
import { sendPushNotification } from '@/lib/push-notifications'
import { logger } from '@/lib/logger'

// Alert generation, shared by POST /api/alerts/generate (a signed-in user
// opening the dashboard) and the nightly cron sweep. It used to live only in
// the route, which meant alerts existed solely for users who happened to log
// in — the opposite of who needs an overspend warning.

export async function generateAlertsForUser(userId: string): Promise<string[]> {
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [txThisMonth, prevRawTxns, budgetStatus, alerts24h] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthAgo } },
      orderBy: { date: 'desc' },
      take: 300,
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevMonthStart, lt: monthAgo } },
      select: { amount: true, direction: true, merchantCategory: true },
      take: 300,
    }),
    budgetStatuses(userId, now),
    prisma.alert.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { title: true },
    }),
  ])

  if (txThisMonth.length === 0) return []

  const existingTitles = new Set(alerts24h.map((a) => a.title))
  const created: string[] = []

  const expenses = sum(
    txThisMonth.filter((t) => t.direction === 'debit').map((t) => Math.abs(t.amount))
  )
  const prevExpenses = sum(
    prevRawTxns.filter((t) => t.direction === 'debit').map((t) => Math.abs(t.amount))
  )

  // Overspend detection vs last month
  if (prevExpenses > 0) {
    const change = ((expenses - prevExpenses) / prevExpenses) * 100
    if (change > 25) {
      const title = 'Spending increased significantly'
      if (!existingTitles.has(title)) {
        await raiseAlert({
          userId,
          type: 'overspend',
          title,
          message: `Your spending is up ${change.toFixed(0)}% this month ($${prevExpenses.toFixed(0)} → $${expenses.toFixed(0)}). Review your top categories to find areas to cut back.`,
          severity: change > 50 ? 'critical' : 'warning',
          // Critical and warning interrupt; info waits to be found.
          push: true,
        })
        created.push(title)
      }
    }
  }

  // Budget overruns. Uses the same status calculation as the budgets screen —
  // same category normalisation, same period window — so the two can no longer
  // disagree about whether a budget is blown. Previously this matched
  // categories by substring against a fixed 30-day window and only ever looked
  // at monthly budgets.
  for (const budget of budgetStatus) {
    if (budget.isOver) {
      const title = `Budget exceeded: ${budget.category}`
      if (!existingTitles.has(title)) {
        await raiseAlert({
          userId,
          type: 'overspend',
          title,
          message: `You've spent ${budget.spent.toFixed(0)} of your ${budget.amount.toFixed(0)} ${budget.period} budget for ${budget.category} (${budget.window.label}). Consider adjusting or pausing non-essential spend.`,
          severity: gt(budget.spent, multiply(budget.amount, 1.2)) ? 'critical' : 'warning',
          push: true,
        })
        created.push(title)
      }
      continue
    }

    // Not over yet, but spending far ahead of the period — the warning that is
    // actually actionable, because there is still time to change course.
    if (budget.isOnPace) {
      const title = `On pace to exceed: ${budget.category}`
      if (!existingTitles.has(title)) {
        await raiseAlert({
          userId,
          type: 'overspend',
          title,
          message: `You've used ${Math.round(budget.used * 100)}% of your ${budget.category} budget with ${Math.round((1 - budget.elapsed) * 100)}% of ${budget.window.label} left. About $${budget.safeDailySpend.toFixed(2)} a day keeps you inside it.`,
          severity: 'info',
          // Critical and warning interrupt; info waits to be found.
          push: false,
        })
        created.push(title)
      }
    }
  }

  // Category-level spike detection
  const byCategory: Record<string, number> = {}
  for (const t of txThisMonth) {
    if (t.direction !== 'debit') continue
    const cat = canonicalCategory(t.merchantCategory)
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
  }

  const prevCatMap: Record<string, number> = {}
  for (const t of prevRawTxns) {
    if (t.direction !== 'debit') continue
    const cat = canonicalCategory(t.merchantCategory)
    prevCatMap[cat] = (prevCatMap[cat] || 0) + Math.abs(t.amount)
  }

  for (const [cat, total] of Object.entries(byCategory)) {
    const prevTotal = prevCatMap[cat] || 0
    if (prevTotal > 50 && total > prevTotal * 1.5) {
      const title = `${cat} spending spike`
      if (!existingTitles.has(title)) {
        await raiseAlert({
          userId,
          type: 'overspend',
          title,
          message: `Your ${cat} spending jumped to $${total.toFixed(0)} (${(((total - prevTotal) / prevTotal) * 100).toFixed(0)}% increase from $${prevTotal.toFixed(0)}). Check if this is a one-time expense or a new pattern.`,
          severity: total > prevTotal * 2 ? 'critical' : 'warning',
          // Critical and warning interrupt; info waits to be found.
          push: true,
        })
        created.push(title)
      }
    }
  }

  // Transaction-level anomalies, judged against this user's own baseline.
  // The checks above are all lagging totals; these catch a single charge that
  // is out of character on the day it lands.
  // The last week is what gets flagged; the last month is what "normal" is
  // measured from. The previous-month rows are not usable as a baseline here —
  // they are selected without ids or dates for the totals comparison above.
  const recentWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const debits = txThisMonth.filter((t) => t.direction === 'debit')
  const anomalies = detectAnomalies(
    debits.filter((t) => t.date >= recentWindow),
    debits
  )

  for (const anomaly of anomalies.slice(0, 5)) {
    const title = `${anomaly.title}: ${anomaly.merchant}`
    if (existingTitles.has(title)) continue
    await raiseAlert({
      userId,
      type: anomaly.type === 'duplicate_charge' ? 'duplicate' : 'unusual',
      title,
      message: anomaly.message,
      severity: anomaly.severity,
      // A duplicate charge is the one worth a buzz: it is disputable, and only
      // while the user still remembers the purchase.
      push: anomaly.severity !== 'info',
    })
    created.push(title)
  }

  return created
}

/**
 * Writes an alert and pushes it.
 *
 * Alerts were only ever inserted into the database, so a duplicate charge or a
 * blown budget sat there until the user happened to open the app. The value of
 * "you were charged twice at Tesco" collapses if it arrives next Tuesday.
 */
async function raiseAlert(params: {
  userId: string
  type: string
  title: string
  message: string
  severity: string
  push: boolean
}): Promise<void> {
  await prisma.alert.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
    },
  })

  // Only things worth interrupting someone for. An informational nudge does
  // not earn a buzz, and a stream of them trains people to disable the lot.
  if (!params.push) return

  try {
    await sendPushNotification(params.userId, {
      title: params.title,
      body: params.message.slice(0, 160),
      tag: `alert-${params.type}`,
      url: '/dashboard/alerts',
    })
  } catch (err) {
    // Delivery is best-effort; the alert is already recorded.
    logger.warn('Alert push failed', { userId: params.userId, error: err })
  }
}
