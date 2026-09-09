import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getStripe, ensureStripeCustomer, billingConfigured } from '@/lib/stripe'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/billing/portal — opens the Stripe customer portal, where the user
// updates payment methods, downloads invoices, or cancels. Cancellation flows
// through Stripe rather than a bespoke endpoint so there is one source of
// truth for subscription state.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    key: `billing-portal:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  if (!billingConfigured()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 })
  }

  try {
    const customerId = await ensureStripeCustomer(session.user.id)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (err) {
    logger.error('Billing portal session failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not open the billing portal.')
    return NextResponse.json({ error }, { status })
  }
}
