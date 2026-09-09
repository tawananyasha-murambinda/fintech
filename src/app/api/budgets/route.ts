import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { budgetStatuses, totalMonthlyCommitment } from '@/lib/budgets'
import { canonicalCategory, BUDGETABLE_CATEGORIES } from '@/lib/categories'
import { isBudgetPeriod } from '@/lib/budget-period'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const budgets = await budgetStatuses(session.user.id)

    return NextResponse.json(
      {
        budgets,
        totalMonthlyCommitment: totalMonthlyCommitment(budgets),
        categories: BUDGETABLE_CATEGORIES,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    logger.error('Budget listing failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not load your budgets right now.')
    return NextResponse.json({ error }, { status })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { category, amount, period } = body

  if (!category || amount === undefined) {
    return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
  }

  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount)
  if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 })
  }

  // Store the canonical form so a budget always matches the same transactions,
  // however the category was spelled on the way in.
  const canonical = canonicalCategory(category)
  if (canonical === 'Uncategorized') {
    return NextResponse.json(
      { error: 'Choose a spending category to budget against.', categories: BUDGETABLE_CATEGORIES },
      { status: 400 }
    )
  }

  const resolvedPeriod = isBudgetPeriod(period) ? period : 'monthly'

  const budget = await prisma.budget.upsert({
    where: { userId_category_period: { userId: session.user.id, category: canonical, period: resolvedPeriod } },
    update: { amount: parsedAmount },
    create: { userId: session.user.id, category: canonical, amount: parsedAmount, period: resolvedPeriod },
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
