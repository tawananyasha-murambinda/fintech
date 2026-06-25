import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  const days = period === 'year' ? 365 : period === 'quarter' ? 90 : 30
  const startDate = new Date(year, period === 'year' ? 0 : month - 1, 1)
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)

  const userId = session.user.id

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
  })

  const income = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenses = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

  const byCategory: Record<string, number> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const cat = (t.merchantCategory || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
  }

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, total]) => ({ category, total, percentage: expenses > 0 ? (total / expenses) * 100 : 0 }))

  const byDay: Record<string, number> = {}
  for (const t of transactions) {
    const day = t.date.toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + (t.direction === 'credit' ? Math.abs(t.amount) : -Math.abs(t.amount))
  }

  const dailyTotals = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, net]) => ({ date, net }))

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const avgTransaction = transactions.length > 0 ? expenses / transactions.length : 0
  const txCount = transactions.length

  return NextResponse.json({
    period: period === 'year' ? `Year ${year}` : `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
    income,
    expenses,
    netCashflow: income - expenses,
    savingsRate,
    txCount,
    avgTransaction,
    topCategories,
    dailyTotals,
  })
}
