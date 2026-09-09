// Plan definitions and entitlements.
//
// ⚠️ The price points and limits below are placeholders — they are a working
// default, not a pricing recommendation. Set them to whatever you actually
// charge, and set the matching Stripe price IDs in the environment.
//
// Everything the app gates on reads from ENTITLEMENTS, so changing a limit is
// a one-line edit here rather than a hunt through the routes.

export type PlanId = 'free' | 'plus' | 'pro'

export const PLAN_IDS: PlanId[] = ['free', 'plus', 'pro']

export function isPlanId(value: string | null | undefined): value is PlanId {
  return !!value && (PLAN_IDS as string[]).includes(value)
}

export type Entitlements = {
  /** Linked bank connections. Each one carries a real monthly Plaid cost. */
  linkedBanks: number
  /** AI assistant + analysis calls per UTC day. */
  aiCallsPerDay: number
  /** Months of transaction history retained and queryable. */
  historyMonths: number
  householdMembers: number
  exportFormats: string[]
  prioritySupport: boolean
}

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    linkedBanks: 1,
    aiCallsPerDay: 5,
    historyMonths: 3,
    householdMembers: 1,
    exportFormats: ['json'],
    prioritySupport: false,
  },
  plus: {
    linkedBanks: 5,
    aiCallsPerDay: 60,
    historyMonths: 24,
    householdMembers: 3,
    exportFormats: ['json', 'csv'],
    prioritySupport: false,
  },
  pro: {
    linkedBanks: 25,
    aiCallsPerDay: 300,
    historyMonths: 120,
    householdMembers: 10,
    exportFormats: ['json', 'csv', 'pdf'],
    prioritySupport: true,
  },
}

export type PlanDisplay = {
  id: PlanId
  name: string
  /** Monthly price in minor units (cents). Display only — Stripe is the source of truth for what is charged. */
  monthlyPriceCents: number
  tagline: string
  features: string[]
}

export const PLAN_DISPLAY: Record<PlanId, PlanDisplay> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPriceCents: 0,
    tagline: 'Track one account and see where the money goes.',
    features: ['1 linked bank', '3 months of history', '5 AI questions a day', 'Budgets, goals and bills'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    monthlyPriceCents: 700,
    tagline: 'Every account in one place, with the AI assistant unlocked.',
    features: ['5 linked banks', '2 years of history', '60 AI questions a day', 'CSV export', 'Household sharing (3)'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCents: 1500,
    tagline: 'For complex finances — many accounts, tax, and net worth.',
    features: ['25 linked banks', '10 years of history', '300 AI questions a day', 'CSV + PDF export', 'Household sharing (10)', 'Priority support'],
  },
}

export function entitlementsFor(plan: string | null | undefined): Entitlements {
  return ENTITLEMENTS[isPlanId(plan) ? plan : 'free']
}

// Maps a Stripe price ID back to a plan. Set these to the price IDs from your
// Stripe dashboard; an unmapped price falls back to `free` rather than
// silently granting the top tier.
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_PLUS) return 'plus'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return null
}

export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === 'plus') return process.env.STRIPE_PRICE_PLUS || null
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || null
  return null
}

// Stripe statuses that should keep a paid plan switched on. `past_due` is
// included deliberately: Stripe retries the payment for days, and cutting a
// paying customer off on the first failed charge loses more than it saves.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export function statusGrantsAccess(status: string | null | undefined): boolean {
  return !!status && ACTIVE_STATUSES.has(status)
}
