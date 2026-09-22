import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { detectSubscriptions } from '@/lib/subscriptions'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    // A year of history, so an annual subscription can actually be seen. The
    // previous 90-day window could never detect one.
    const since = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000)

    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id, direction: 'debit', date: { gte: since } },
      orderBy: { date: 'desc' },
      select: { merchantName: true, description: true, merchantCategory: true, amount: true, date: true },
      take: 3000,
    })

    const result = detectSubscriptions(transactions, now)

    return NextResponse.json({
      ...result,
      count: result.subscriptions.length,
      // Surfaced separately so the page can lead with what needs a decision
      // rather than making the user scan the whole list for it.
      needsAttention: {
        priceIncreases: result.subscriptions.filter(
          (s) => s.priceChanged && (s.priceChangeMonthly ?? 0) > 0
        ).length,
        dormant: result.subscriptions.filter((s) => s.dormant).length,
        // What the increases add up to over a year, which is the number that
        // actually changes behaviour.
        yearlyCostOfIncreases:
          Math.round(
            result.subscriptions.reduce(
              (sum, s) => sum + Math.max(0, s.priceChangeMonthly ?? 0) * 12,
              0
            ) * 100
          ) / 100,
      },
    })
  } catch (err) {
    logger.error('Subscription detection failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not analyse your subscriptions right now.')
    return NextResponse.json({ error }, { status })
  }
}
