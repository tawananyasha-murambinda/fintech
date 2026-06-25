import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

async function getDashboardData(userId: string, accountId?: string | null) {
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const accountFilter = accountId ? { linkedBankId: accountId } : {}

  const [banks, txThisMonth, txLastMonth, recentTx] = await Promise.all([
    prisma.linkedBank.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthAgo }, ...accountFilter },
      select: { amount: true, direction: true, date: true, merchantCategory: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevMonthStart, lt: monthAgo }, ...accountFilter },
      select: { amount: true, direction: true },
    }),
    prisma.transaction.findMany({
      where: { userId, ...accountFilter },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true, date: true, amount: true, direction: true,
        description: true, merchantName: true, merchantCategory: true,
        status: true,
      },
    }),
  ])

  const income = txThisMonth.filter((t) => t.direction === 'credit').reduce((s: number, t) => s + Math.abs(t.amount), 0)
  const expenses = txThisMonth.filter((t) => t.direction === 'debit').reduce((s: number, t) => s + Math.abs(t.amount), 0)
  const prevExpenses = txLastMonth.filter((t) => t.direction === 'debit').reduce((s: number, t) => s + Math.abs(t.amount), 0)

  const cashflowMap: Record<string, { income: number; expenses: number }> = {}
  for (const tx of txThisMonth) {
    const day = tx.date.toISOString().split('T')[0]
    if (!cashflowMap[day]) cashflowMap[day] = { income: 0, expenses: 0 }
    if (tx.direction === 'credit') cashflowMap[day].income += Math.abs(tx.amount)
    else cashflowMap[day].expenses += Math.abs(tx.amount)
  }

  const cashflow = Object.entries(cashflowMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals, net: vals.income - vals.expenses }))

  const catMap: Record<string, number> = {}
  for (const tx of txThisMonth.filter((t) => t.direction === 'debit')) {
    const cat = tx.merchantCategory || 'Uncategorized'
    catMap[cat] = (catMap[cat] || 0) + Math.abs(tx.amount)
  }

  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, total]) => ({ category, total, percentage: (total / expenses) * 100 }))

  return {
    stats: {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      netCashflow: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      expenseChange: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
      linkedAccounts: banks.length,
    },
    cashflow,
    categories,
    recentTransactions: recentTx.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    })),
    hasData: txThisMonth.length > 0,
  }
}

interface DashboardPageProps {
  searchParams?: Promise<{ account?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/login')

  const sp = await searchParams
  const accountId = sp?.account || null

  const data = await getDashboardData(session.user.id, accountId)

  return (
    <DashboardClient
      data={data}
      userName={session.user.name || 'there'}
      userId={session.user.id}
      selectedAccountId={accountId}
    />
  )
}
