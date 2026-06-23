import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeSpending } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const period = (body.period as 'week' | 'month' | 'quarter') || 'month'
  const userLocation = body.location

  // Check cache (1-hour TTL)
  const cached = await prisma.aiInsight.findFirst({
    where: {
      userId: session.user.id,
      type: 'full_analysis',
      period,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (cached) {
    return NextResponse.json({ analysis: cached.data, cached: true })
  }

  // Fetch transactions for the period
  const now = new Date()
  const fromDate = new Date(
    now.getTime() -
      (period === 'week' ? 7 : period === 'quarter' ? 90 : 30) * 24 * 60 * 60 * 1000
  )

  const rawTxns = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: fromDate },
    },
    orderBy: { date: 'desc' },
    take: 500,
  })

  if (rawTxns.length === 0) {
    return NextResponse.json({ error: 'No transaction data available for this period.' }, { status: 404 })
  }

  const transactions = rawTxns.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    merchantName: t.merchantName ?? undefined,
    merchantCategory: t.merchantCategory ?? undefined,
    merchantCity: t.merchantCity ?? undefined,
    merchantState: t.merchantState ?? undefined,
    merchantCountry: t.merchantCountry ?? undefined,
    type: t.type ?? undefined,
    runningBalance: t.runningBalance ?? undefined,
    direction: t.direction as 'credit' | 'debit',
    status: t.status as 'posted' | 'pending',
  }))

  const analysis = await analyzeSpending({ transactions, period, userLocation })

  // Cache the result
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.aiInsight.create({
    data: {
      userId: session.user.id,
      type: 'full_analysis',
      period,
      data: analysis as any,
      expiresAt,
    },
  })

  return NextResponse.json({ analysis, cached: false })
}
