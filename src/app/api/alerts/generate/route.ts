import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [txThisMonth, prevRawTxns, budgets, alerts24h] = await Promise.all([
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
    prisma.budget.findMany({ where: { userId, period: 'monthly' } }),
    prisma.alert.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ])

  if (txThisMonth.length === 0) {
    return NextResponse.json({ generated: 0, message: 'No transactions to analyze.' })
  }

  const existingTitles = new Set(alerts24h.map(a => a.title))
  const created: string[] = []

  const expenses = txThisMonth.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const prevExpenses = prevRawTxns.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

  // Overspend detection vs last month
  if (prevExpenses > 0) {
    const change = ((expenses - prevExpenses) / prevExpenses) * 100
    if (change > 25) {
      const title = 'Spending increased significantly'
      if (!existingTitles.has(title)) {
        await prisma.alert.create({
          data: { userId, type: 'overspend', title, message: `Your spending is up ${change.toFixed(0)}% this month ($${prevExpenses.toFixed(0)} → $${expenses.toFixed(0)}). Review your top categories to find areas to cut back.`, severity: change > 50 ? 'critical' : 'warning' },
        })
        created.push(title)
      }
    }
  }

  // Budget overruns (compute spent from this month's transactions)
  for (const budget of budgets) {
    const spent = txThisMonth
      .filter(t => t.direction === 'debit' && (t.merchantCategory || '').toLowerCase().includes(budget.category.toLowerCase()))
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    if (spent > budget.amount) {
      const title = `Budget exceeded: ${budget.category}`
      if (!existingTitles.has(title)) {
        await prisma.alert.create({
          data: { userId, type: 'overspend', title, message: `You've spent $${spent.toFixed(0)} of $${budget.amount.toFixed(0)} budget for ${budget.category}. Consider adjusting or pausing non-essential spend.`, severity: spent > budget.amount * 1.2 ? 'critical' : 'warning' },
        })
        created.push(title)
      }
    }
  }

  // Category-level spike detection
  const byCategory: Record<string, number> = {}
  for (const t of txThisMonth) {
    if (t.direction !== 'debit') continue
    const cat = (t.merchantCategory || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
  }

  const prevCatMap: Record<string, number> = {}
  for (const t of prevRawTxns) {
    if (t.direction !== 'debit') continue
    const cat = (t.merchantCategory || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    prevCatMap[cat] = (prevCatMap[cat] || 0) + Math.abs(t.amount)
  }

  for (const [cat, total] of Object.entries(byCategory)) {
    const prevTotal = prevCatMap[cat] || 0
    if (prevTotal > 50 && total > prevTotal * 1.5) {
      const title = `${cat} spending spike`
      if (!existingTitles.has(title)) {
        await prisma.alert.create({
          data: { userId, type: 'overspend', title, message: `Your ${cat} spending jumped to $${total.toFixed(0)} (${((total - prevTotal) / prevTotal * 100).toFixed(0)}% increase from $${prevTotal.toFixed(0)}). Check if this is a one-time expense or a new pattern.`, severity: total > prevTotal * 2 ? 'critical' : 'warning' },
        })
        created.push(title)
      }
    }
  }

  // Merchant-level duplicate detection
  const byMerchantDay: Record<string, Set<string>> = {}
  for (const t of txThisMonth) {
    if (t.direction !== 'debit') continue
    const name = t.merchantName || t.description
    const day = t.date.toISOString().split('T')[0]
    const key = `${name}|${day}`
    if (!byMerchantDay[key]) byMerchantDay[key] = new Set()
    byMerchantDay[key].add(t.id)
  }

  for (const [key, ids] of Object.entries(byMerchantDay)) {
    if (ids.size >= 3) {
      const [name] = key.split('|')
      const title = `Multiple charges at ${name}`
      if (!existingTitles.has(title)) {
        await prisma.alert.create({
          data: { userId, type: 'duplicate', title, message: `You had ${ids.size} charges at ${name} on the same day. Review for potential duplicates.`, severity: 'info' },
        })
        created.push(title)
      }
    }
  }

  return NextResponse.json({ generated: created.length, alerts: created })
}
