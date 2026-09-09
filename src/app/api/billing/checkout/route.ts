import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getStripe, ensureStripeCustomer, billingConfigured } from '@/lib/stripe'
import { priceIdForPlan } from '@/lib/plans'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

const schema = z.object({ plan: z.enum(['plus', 'pro']) })

// POST /api/billing/checkout — starts a Stripe Checkout session for an upgrade.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    key: `billing-checkout:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  if (!billingConfigured()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Choose a valid plan to upgrade to.' }, { status: 400 })
    }

    const priceId = priceIdForPlan(parsed.data.plan)
    if (!priceId) {
      logger.error('Checkout requested for a plan with no configured price id', {
        plan: parsed.data.plan,
      })
      return NextResponse.json({ error: 'That plan is not available right now.' }, { status: 503 })
    }

    const customerId = await ensureStripeCustomer(session.user.id)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: session.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/settings/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      // Copied onto the subscription so webhook events carry the user id even
      // when the checkout session itself is long gone.
      subscription_data: { metadata: { userId: session.user.id } },
    })

    if (!checkout.url) throw new Error('Stripe returned a checkout session without a URL')
    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    logger.error('Checkout session creation failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not start checkout. Please try again.')
    return NextResponse.json({ error }, { status })
  }
}
