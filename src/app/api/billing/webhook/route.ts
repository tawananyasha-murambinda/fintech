import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { planForPriceId, statusGrantsAccess, type PlanId } from '@/lib/plans'
import { logger } from '@/lib/logger'

// Signature verification needs the raw request body, so this route must never
// be served from a cached or pre-parsed response.
export const dynamic = 'force-dynamic'

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
])

// Stripe moved `current_period_end` onto subscription items in later API
// versions. Read whichever the pinned version returns.
function periodEndOf(sub: Stripe.Subscription): Date | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end
  const fromItem = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  const seconds = top ?? fromItem?.current_period_end
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null
}

function customerIdOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

// Resolves the FinTrack user for an event. Subscription metadata is the
// primary path; the customer id is the fallback for events that predate it.
async function resolveUserId(
  metadataUserId: string | undefined,
  stripeCustomerId: string | null
): Promise<string | null> {
  if (metadataUserId) {
    const byId = await prisma.user.findUnique({ where: { id: metadataUserId }, select: { id: true } })
    if (byId) return byId.id
  }
  if (stripeCustomerId) {
    const byCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId },
      select: { id: true },
    })
    if (byCustomer) return byCustomer.id
  }
  return null
}

async function applySubscription(sub: Stripe.Subscription): Promise<string | null> {
  const stripeCustomerId = customerIdOf(sub.customer)
  const userId = await resolveUserId(sub.metadata?.userId, stripeCustomerId)
  if (!userId) {
    logger.error('Stripe subscription event could not be matched to a user', {
      subscriptionId: sub.id,
      stripeCustomerId,
    })
    return null
  }

  const priceId = sub.items?.data?.[0]?.price?.id ?? null
  const mappedPlan = planForPriceId(priceId)

  // An unmapped price means the Stripe dashboard and this deploy disagree.
  // Log loudly and leave the existing plan alone rather than downgrading a
  // paying customer because of a config drift.
  if (!mappedPlan && statusGrantsAccess(sub.status)) {
    logger.error('Active subscription has an unrecognised price id — plan left unchanged', {
      subscriptionId: sub.id,
      priceId,
      userId,
    })
  }

  const grantsAccess = statusGrantsAccess(sub.status)
  const plan: PlanId | undefined = grantsAccess ? mappedPlan ?? undefined : 'free'

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(plan ? { plan } : {}),
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: periodEndOf(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
  })

  logger.info('Subscription state applied', { userId, plan: plan ?? 'unchanged', status: sub.status })
  return userId
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    logger.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, secret)
  } catch (err) {
    // A bad signature is either a misconfiguration or a forgery. Never process
    // the payload, and never echo the reason back to the caller.
    logger.error('Stripe webhook signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, handled: false })
  }

  // Idempotency gate. Stripe retries any non-2xx and can deliver an event more
  // than once; the unique primary key makes a replay a no-op.
  try {
    await prisma.billingEvent.create({ data: { id: event.id, type: event.type } })
  } catch (err) {
    // Only a duplicate key means "already processed". Any other failure (the
    // database being down, say) must return non-2xx so Stripe retries —
    // treating it as a replay would silently drop a real plan change.
    const code = (err as { code?: string } | null)?.code
    if (code === 'P2002') {
      logger.info('Stripe webhook replay ignored', { eventId: event.id, type: event.type })
      return NextResponse.json({ received: true, duplicate: true })
    }
    logger.error('Could not record Stripe event for idempotency', {
      eventId: event.id,
      type: event.type,
      error: err,
    })
    return NextResponse.json({ error: 'Could not record event' }, { status: 500 })
  }

  try {
    let userId: string | null = null

    switch (event.type) {
      case 'checkout.session.completed': {
        const checkout = event.data.object as Stripe.Checkout.Session
        const subscriptionId =
          typeof checkout.subscription === 'string'
            ? checkout.subscription
            : checkout.subscription?.id
        if (subscriptionId) {
          // Re-fetch rather than trusting the trimmed object on the session.
          const sub = await getStripe().subscriptions.retrieve(subscriptionId)
          if (!sub.metadata?.userId && checkout.client_reference_id) {
            sub.metadata = { ...sub.metadata, userId: checkout.client_reference_id }
          }
          userId = await applySubscription(sub)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        userId = await applySubscription(event.data.object as Stripe.Subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeCustomerId = customerIdOf(invoice.customer)
        userId = await resolveUserId(undefined, stripeCustomerId)
        // Access is not revoked here — Stripe retries the charge for days and
        // emits customer.subscription.updated when it finally gives up.
        logger.warn('Invoice payment failed', { userId, invoiceId: invoice.id })
        break
      }
    }

    if (userId) {
      await prisma.billingEvent.update({ where: { id: event.id }, data: { userId } })
    }

    return NextResponse.json({ received: true, handled: true })
  } catch (err) {
    // Roll the idempotency record back so Stripe's retry can reprocess it.
    await prisma.billingEvent.delete({ where: { id: event.id } }).catch(() => {})
    logger.error('Stripe webhook handler failed', { eventId: event.id, type: event.type, error: err })
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
