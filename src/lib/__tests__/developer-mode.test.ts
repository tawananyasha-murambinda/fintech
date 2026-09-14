import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  effectiveEntitlements,
  isDeveloperEmail,
  developerModeConfigured,
  DEVELOPER_ENTITLEMENTS,
  ENTITLEMENTS,
} from '../plans'

const DEV = 'dev@example.com'

describe('developer mode', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    delete process.env.DEVELOPER_EMAILS
    delete process.env.DEVELOPER_FORCE_PLAN
  })
  afterEach(() => {
    process.env = { ...saved }
  })

  it('is off unless the allow-list is set', () => {
    expect(developerModeConfigured()).toBe(false)
    expect(isDeveloperEmail(DEV)).toBe(false)
    expect(effectiveEntitlements('free', DEV).entitlements).toEqual(ENTITLEMENTS.free)
  })

  it('lifts limits for a listed address', () => {
    process.env.DEVELOPER_EMAILS = DEV

    const result = effectiveEntitlements('free', DEV)
    expect(result.isDeveloper).toBe(true)
    expect(result.entitlements).toEqual(DEVELOPER_ENTITLEMENTS)
    expect(result.entitlements.linkedBanks).toBeGreaterThan(ENTITLEMENTS.pro.linkedBanks)
  })

  it('leaves everyone else on their real plan', () => {
    process.env.DEVELOPER_EMAILS = DEV

    const other = effectiveEntitlements('free', 'someone@example.com')
    expect(other.isDeveloper).toBe(false)
    expect(other.entitlements).toEqual(ENTITLEMENTS.free)
  })

  it('matches case-insensitively and ignores surrounding whitespace', () => {
    process.env.DEVELOPER_EMAILS = ' Dev@Example.com , other@example.com '

    expect(isDeveloperEmail('dev@example.com')).toBe(true)
    expect(isDeveloperEmail('  DEV@EXAMPLE.COM ')).toBe(true)
    expect(isDeveloperEmail('other@example.com')).toBe(true)
  })

  it('never grants access on a missing or empty email', () => {
    process.env.DEVELOPER_EMAILS = DEV

    expect(isDeveloperEmail(null)).toBe(false)
    expect(isDeveloperEmail(undefined)).toBe(false)
    expect(isDeveloperEmail('')).toBe(false)
    expect(isDeveloperEmail('   ')).toBe(false)
  })

  it('does not treat an empty allow-list as "everyone"', () => {
    // The failure mode that would matter: a blank env var granting unlimited
    // access to every account.
    process.env.DEVELOPER_EMAILS = ''
    expect(isDeveloperEmail(DEV)).toBe(false)

    process.env.DEVELOPER_EMAILS = ' , , '
    expect(isDeveloperEmail(DEV)).toBe(false)
    expect(isDeveloperEmail('anyone@example.com')).toBe(false)
  })

  it('does not match a partial or lookalike address', () => {
    process.env.DEVELOPER_EMAILS = DEV

    expect(isDeveloperEmail('dev@example.com.attacker.test')).toBe(false)
    expect(isDeveloperEmail('notdev@example.com')).toBe(false)
    expect(isDeveloperEmail('dev@example.co')).toBe(false)
  })

  it('can imitate a real tier so limits can be tested', () => {
    process.env.DEVELOPER_EMAILS = DEV
    process.env.DEVELOPER_FORCE_PLAN = 'plus'

    const result = effectiveEntitlements('free', DEV)
    expect(result.isDeveloper).toBe(true)
    expect(result.simulatedPlan).toBe('plus')
    expect(result.entitlements).toEqual(ENTITLEMENTS.plus)
  })

  it('ignores an unrecognised forced plan rather than falling open', () => {
    process.env.DEVELOPER_EMAILS = DEV
    process.env.DEVELOPER_FORCE_PLAN = 'enterprise'

    const result = effectiveEntitlements('free', DEV)
    expect(result.simulatedPlan).toBeNull()
    expect(result.entitlements).toEqual(DEVELOPER_ENTITLEMENTS)
  })

  it('does not let a forced plan affect a non-developer', () => {
    process.env.DEVELOPER_FORCE_PLAN = 'pro'

    const result = effectiveEntitlements('free', 'someone@example.com')
    expect(result.entitlements).toEqual(ENTITLEMENTS.free)
    expect(result.simulatedPlan).toBeNull()
  })
})
