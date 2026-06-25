import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const category = searchParams.get('category')
  const direction = searchParams.get('direction')
  const search = searchParams.get('search')

  const now = new Date()
  let fromDate: Date

  switch (period) {
    case 'week':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default: // month
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const where: any = {
    userId: session.user.id,
    date: { gte: fromDate },
  }

  if (category) where.merchantCategory = category
  if (direction) where.direction = direction
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { merchantName: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          date: true,
          amount: true,
          direction: true,
          description: true,
          merchantName: true,
          merchantCategory: true,
          merchantCity: true,
          merchantState: true,
          merchantCountry: true,
          status: true,
          type: true,
          runningBalance: true,
        },
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Transactions API error:', err)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }
}
