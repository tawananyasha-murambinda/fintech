import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { entitlementsFor, type Entitlements, type PlanId, isPlanId } from '@/lib/plans'

// Lazily constructed for the same reason as the encryption key: a missing
// STRIPE_SECRET_KEY should fail the billing routes, not the whole app.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pinned so a Stripe-side API upgrade cannot change response shapes
      // under a running deploy.
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'FinTrack' },
    })
  }
  return _stripe
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export type UserBilling = {
  plan: PlanId
  entitlements: Entitlements
  status: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
}

export async function getUserBilling(userId: string): Promise<UserBilling> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
    },
  })

  const plan: PlanId = isPlanId(user?.plan) ? user.plan : 'free'
  return {
    plan,
    entitlements: entitlementsFor(plan),
    status: user?.subscriptionStatus ?? null,
    currentPeriodEnd: user?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: user?.cancelAtPeriodEnd ?? false,
    hasStripeCustomer: Boolean(user?.stripeCustomerId),
  }
}

// Returns the Stripe customer for a user, creating one on first use. The id is
// written back immediately so a later failure cannot orphan the customer.
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  })
  if (!user) throw new Error('User not found')
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    // Lets the webhook resolve a customer back to a user even if the
    // client_reference_id is missing from an event.
    metadata: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}
