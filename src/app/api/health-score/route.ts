import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [transactions, budgets, goals, assets, liabilities, bills] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthAgo } },
      select: { amount: true, direction: true, merchantCategory: true },
    }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.asset.findMany({ where: { userId } }),
    prisma.liability.findMany({ where: { userId } }),
    prisma.bill.findMany({ where: { userId, isActive: true } }),
  ])

  const income = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenses = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

  let score = 50

  // Savings rate component (0-25 points)
  const savingsRate = income > 0 ? (income - expenses) / income : 0
  score += Math.min(25, Math.round(savingsRate * 100))

  // Budget adherence (0-20 points)
  if (budgets.length > 0) score += 10
  const budgetCatCount = budgets.length
  score += Math.min(10, budgetCatCount * 2)

  // Debt-to-income (0-20 points)
  const totalDebt = liabilities.reduce((s, l) => s + l.balance, 0)
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  if (totalDebt === 0) {
    score += 20
  } else if (income > 0) {
    const dti = totalDebt / (income * 12)
    if (dti < 0.3) score += 15
    else if (dti < 0.5) score += 10
    else score += 5
  }

  // Goals progress (0-15 points)
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length
  const inProgress = goals.filter(g => g.currentAmount > 0 && g.currentAmount < g.targetAmount).length
  score += Math.min(15, completedGoals * 5 + inProgress * 2)

  // Bill coverage (0-10 points)
  if (bills.length > 0 && income > 0) {
    const billTotal = bills.reduce((s, b) => s + b.amount, 0)
    const billRatio = billTotal / income
    if (billRatio < 0.3) score += 10
    else if (billRatio < 0.5) score += 5
    else score += 2
  }

  // Net worth positive (0-10 points)
  if (totalAssets > totalDebt) score += 10
  else if (totalAssets > 0) score += 3

  const factors = [
    { label: 'Savings rate', value: `${(savingsRate * 100).toFixed(0)}%`, weight: 25, score: Math.min(25, Math.round(savingsRate * 100)) },
    { label: 'Budget coverage', value: `${budgetCatCount} categories`, weight: 20, score: Math.min(20, budgetCatCount * 2 + (budgets.length > 0 ? 10 : 0)) },
    { label: 'Debt-to-income', value: income > 0 ? `${((totalDebt / (income * 12)) * 100).toFixed(0)}%` : 'N/A', weight: 20, score: totalDebt === 0 ? 20 : 5 },
    { label: 'Goals progress', value: `${completedGoals} completed`, weight: 15, score: Math.min(15, completedGoals * 5 + inProgress * 2) },
    { label: 'Net worth', value: totalAssets > totalDebt ? 'Positive' : 'Negative', weight: 10, score: totalAssets > totalDebt ? 10 : 3 },
    { label: 'Bill coverage', value: `${bills.length} bills`, weight: 10, score: bills.length > 0 && income > 0 ? 10 : 2 },
  ]

  const rating = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work'

  return NextResponse.json({
    score,
    rating,
    factors,
    details: {
      savingsRate,
      budgetCount: budgetCatCount,
      totalDebt,
      totalAssets,
      completedGoals,
      inProgressGoals: inProgress,
      billCount: bills.length,
      monthlyIncome: income,
      monthlyExpenses: expenses,
    },
  })
}
