import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { round, sum } from '@/lib/money'
import { notifyGoalAchieved } from '@/lib/notifications'
import { sendPushNotification } from '@/lib/push-notifications'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// Goals previously held only a running total, so progress could not be
// explained — no history of what went in, when, or why — and nothing could be
// undone. Contributions are a ledger, the same way vault round-ups are.

const schema = z.object({
  goalId: z.string().min(1),
  amount: z.number(),
  note: z.string().max(200).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const goalId = searchParams.get('goalId')

  const contributions = await prisma.goalContribution.findMany({
    where: { userId: session.user.id, ...(goalId ? { goalId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({
    contributions,
    total: sum(contributions.map((c) => c.amount)),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success || parsed.data.amount === 0) {
      return NextResponse.json({ error: 'Enter an amount to add or take out.' }, { status: 400 })
    }

    const { goalId, amount, note } = parsed.data

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
      select: { id: true, name: true, targetAmount: true, currentAmount: true },
    })
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    // Negative amounts are withdrawals, but a goal cannot hold less than zero.
    const delta = round(amount)
    if (delta < 0 && Math.abs(delta) > goal.currentAmount + 0.01) {
      return NextResponse.json(
        { error: `You can take out at most ${goal.currentAmount.toFixed(2)}.` },
        { status: 400 }
      )
    }

    // Ledger row and running total move together, so a crash between them
    // cannot leave a goal showing money it cannot account for.
    const [, updated] = await prisma.$transaction([
      prisma.goalContribution.create({
        data: {
          userId: session.user.id,
          goalId,
          amount: delta,
          source: 'manual',
          note: note ?? null,
        },
      }),
      prisma.goal.update({
        where: { id: goalId },
        data: { currentAmount: { increment: delta } },
        select: { currentAmount: true, targetAmount: true, name: true },
      }),
    ])

    // Only when the goal crosses the line on this contribution, so it is not
    // announced again on every subsequent top-up.
    const justCompleted =
      goal.currentAmount < goal.targetAmount && updated.currentAmount >= updated.targetAmount

    if (justCompleted) {
      await notifyGoalAchieved(session.user.id, updated.name).catch(() => undefined)
      await sendPushNotification(session.user.id, {
        title: 'Goal reached',
        body: `You hit your ${updated.name} goal.`,
        tag: `goal-${goalId}`,
        url: '/dashboard/goals',
      }).catch(() => undefined)
    }

    return NextResponse.json({
      goal: updated,
      justCompleted,
      percentComplete:
        updated.targetAmount > 0 ? round((updated.currentAmount / updated.targetAmount) * 100) : 0,
    })
  } catch (err) {
    logger.error('Goal contribution failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not record that contribution.')
    return NextResponse.json({ error }, { status })
  }
}
