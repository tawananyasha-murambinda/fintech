import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ENTITLEMENTS,
  PLAN_IDS,
  PLAN_DISPLAY,
  entitlementsFor,
  isPlanId,
  planForPriceId,
  priceIdForPlan,
  statusGrantsAccess,
} from '../plans'

describe('entitlementsFor', () => {
  it('falls back to free for unknown, null, or absent plans', () => {
    expect(entitlementsFor(null)).toEqual(ENTITLEMENTS.free)
    expect(entitlementsFor(undefined)).toEqual(ENTITLEMENTS.free)
    expect(entitlementsFor('enterprise')).toEqual(ENTITLEMENTS.free)
    // A tampered or stale plan string must never widen access.
    expect(entitlementsFor('PRO')).toEqual(ENTITLEMENTS.free)
  })

  it('returns the matching tier for a known plan', () => {
    expect(entitlementsFor('pro')).toEqual(ENTITLEMENTS.pro)
  })

  it('is monotonically more generous as the tier rises', () => {
    expect(ENTITLEMENTS.free.linkedBanks).toBeLessThan(ENTITLEMENTS.plus.linkedBanks)
    expect(ENTITLEMENTS.plus.linkedBanks).toBeLessThan(ENTITLEMENTS.pro.linkedBanks)
    expect(ENTITLEMENTS.free.aiCallsPerDay).toBeLessThan(ENTITLEMENTS.plus.aiCallsPerDay)
    expect(ENTITLEMENTS.plus.aiCallsPerDay).toBeLessThan(ENTITLEMENTS.pro.aiCallsPerDay)
  })

  it('has display copy for every plan id', () => {
    for (const id of PLAN_IDS) {
      expect(PLAN_DISPLAY[id]).toBeDefined()
      expect(PLAN_DISPLAY[id].id).toBe(id)
    }
  })
})

describe('isPlanId', () => {
  it('accepts only the defined plans', () => {
    expect(isPlanId('free')).toBe(true)
    expect(isPlanId('pro')).toBe(true)
    expect(isPlanId('')).toBe(false)
    expect(isPlanId(null)).toBe(false)
    expect(isPlanId('admin')).toBe(false)
  })
})

describe('planForPriceId', () => {
  const saved = { ...process.env }
  beforeEach(() => {
    process.env.STRIPE_PRICE_PLUS = 'price_plus_123'
    process.env.STRIPE_PRICE_PRO = 'price_pro_456'
  })
  afterEach(() => {
    process.env.STRIPE_PRICE_PLUS = saved.STRIPE_PRICE_PLUS
    process.env.STRIPE_PRICE_PRO = saved.STRIPE_PRICE_PRO
  })

  it('maps configured price ids to their plans', () => {
    expect(planForPriceId('price_plus_123')).toBe('plus')
    expect(planForPriceId('price_pro_456')).toBe('pro')
  })

  it('returns null for an unknown price rather than guessing a tier', () => {
    // The webhook relies on this: an unmapped price must not silently grant Pro.
    expect(planForPriceId('price_unknown')).toBeNull()
    expect(planForPriceId(null)).toBeNull()
    expect(planForPriceId(undefined)).toBeNull()
  })

  it('round-trips with priceIdForPlan', () => {
    expect(planForPriceId(priceIdForPlan('plus'))).toBe('plus')
    expect(planForPriceId(priceIdForPlan('pro'))).toBe('pro')
    expect(priceIdForPlan('free')).toBeNull()
  })

  it('does not match an unset price id against an unset env var', () => {
    delete process.env.STRIPE_PRICE_PLUS
    delete process.env.STRIPE_PRICE_PRO
    // Both sides undefined must not be treated as a match.
    expect(planForPriceId(undefined)).toBeNull()
    expect(planForPriceId('')).toBeNull()
  })
})

describe('statusGrantsAccess', () => {
  it('keeps access for active, trialing, and past_due', () => {
    expect(statusGrantsAccess('active')).toBe(true)
    expect(statusGrantsAccess('trialing')).toBe(true)
    // Stripe retries a failed charge for days — cutting off immediately would
    // lock out customers whose card simply needs updating.
    expect(statusGrantsAccess('past_due')).toBe(true)
  })

  it('revokes access for terminal states', () => {
    expect(statusGrantsAccess('canceled')).toBe(false)
    expect(statusGrantsAccess('unpaid')).toBe(false)
    expect(statusGrantsAccess('incomplete_expired')).toBe(false)
    expect(statusGrantsAccess(null)).toBe(false)
    expect(statusGrantsAccess(undefined)).toBe(false)
  })
})
