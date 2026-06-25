import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({ where: { userId: session.user.id }, orderBy: { category: 'asc' } }),
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        direction: 'debit',
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { amount: true, merchantCategory: true },
    }),
  ])

  const categoryTotals: Record<string, number> = {}
  for (const t of transactions) {
    const cat = (t.merchantCategory || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount)
  }

  const budgetsWithSpent = budgets.map((b) => ({
    ...b,
    spent: categoryTotals[b.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())] || 0,
    remaining: b.amount - (categoryTotals[b.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())] || 0),
  }))

  return NextResponse.json(budgetsWithSpent)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { category, amount, period } = body

  if (!category || !amount) {
    return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
  }

  const budget = await prisma.budget.upsert({
    where: { userId_category_period: { userId: session.user.id, category, period: period || 'monthly' } },
    update: { amount },
    create: { userId: session.user.id, category, amount, period: period || 'monthly' },
  })

  return NextResponse.json(budget)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })

  await prisma.budget.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
