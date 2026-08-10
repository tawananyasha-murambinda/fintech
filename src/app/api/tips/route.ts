import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import { generateAiTip } from '@/lib/ai'
import { consumeAiBudget } from '@/lib/ai-budget'
import { logger } from '@/lib/logger'

// GET /api/tips — one fresh, personalised money tip for the current user.
// Each call re-runs the AI so the tip is unique; when the daily AI budget is
// spent the route degrades to a tip computed from the user's own data.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = rateLimit(req, { limit: 30, windowMs: 60 * 60 * 1000, key: `tips:${session.user.id}`, scope: 'user' })
  if (limited) return limited

  try {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { currency: true },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 400,
      }),
    ])

    const hasBudget = await consumeAiBudget(session.user.id)

    const result = await generateAiTip(transactions as any, user?.currency, { allowAi: hasBudget })

    return NextResponse.json({
      ...result,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    logger.error('Tip generation failed', { userId: session.user.id })
    const { error, status } = errorResponse(err, 'Could not generate a tip right now. Please try again.')
    return NextResponse.json({ error }, { status })
  }
}
