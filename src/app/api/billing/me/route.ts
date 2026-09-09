import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserBilling, billingConfigured } from '@/lib/stripe'
import { PLAN_DISPLAY } from '@/lib/plans'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { getAiUsage } from '@/lib/ai-budget'

// GET /api/billing/me — the current plan, what it entitles the user to, and
// how much of it they have used. Drives the billing settings screen.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [billing, linkedBanks, aiUsedToday] = await Promise.all([
      getUserBilling(session.user.id),
      prisma.linkedBank.count({ where: { userId: session.user.id } }),
      getAiUsage(session.user.id),
    ])

    return NextResponse.json({
      plan: billing.plan,
      planName: PLAN_DISPLAY[billing.plan].name,
      status: billing.status,
      currentPeriodEnd: billing.currentPeriodEnd,
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
      manageable: billing.hasStripeCustomer && billingConfigured(),
      checkoutAvailable: billingConfigured(),
      entitlements: billing.entitlements,
      usage: {
        linkedBanks,
        aiCallsToday: aiUsedToday,
      },
      plans: Object.values(PLAN_DISPLAY),
    })
  } catch (err) {
    logger.error('Billing summary failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not load your billing details.')
    return NextResponse.json({ error }, { status })
  }
}
