import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkConfiguration, summariseConfiguration, describeGaps } from '../config-check'

const CRITICAL = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ENCRYPTION_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'CRON_SECRET',
]

describe('configuration checks', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (/^(DATABASE_URL|NEXTAUTH|ENCRYPTION|PLAID|CRON|UPSTASH|RESEND|ANTHROPIC|VAPID|SENTRY|STRIPE)/.test(key)) {
        delete process.env[key]
      }
    }
  })
  afterEach(() => {
    process.env = { ...saved }
  })

  it('reports a fully unconfigured deployment as not ok', () => {
    const summary = summariseConfiguration()
    expect(summary.ok).toBe(false)
    expect(summary.missingCritical.length).toBeGreaterThan(0)
  })

  it('becomes ok once every critical setting is present', () => {
    for (const key of CRITICAL) process.env[key] = 'x'
    expect(summariseConfiguration().ok).toBe(true)
  })

  it('does not fail the deployment for a missing Stripe key', () => {
    // Not selling subscriptions yet is a decision, not a fault, and should not
    // page anyone.
    for (const key of CRITICAL) process.env[key] = 'x'
    const summary = summariseConfiguration()

    expect(summary.ok).toBe(true)
    expect(summary.missingOptional.some((c) => c.key.includes('STRIPE'))).toBe(true)
  })

  it('treats a missing CRON_SECRET as critical and says what stops', () => {
    // The gap that went unnoticed: everything scheduled dies in silence.
    for (const key of CRITICAL) process.env[key] = 'x'
    delete process.env.CRON_SECRET

    const summary = summariseConfiguration()
    expect(summary.ok).toBe(false)

    const cron = summary.missingCritical.find((c) => c.key === 'CRON_SECRET')
    expect(cron?.impact).toMatch(/bill reminders/i)
    expect(cron?.impact).toMatch(/round-ups|snapshots/i)
  })

  it('treats a half-configured pair as missing', () => {
    // Half of a credential pair is as broken as none of it.
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    const upstash = checkConfiguration().find((c) => c.key.includes('UPSTASH'))
    expect(upstash?.configured).toBe(false)
  })

  it('treats an empty string as unset', () => {
    process.env.CRON_SECRET = '   '
    const cron = checkConfiguration().find((c) => c.key === 'CRON_SECRET')
    expect(cron?.configured).toBe(false)
  })

  it('never includes a secret value in what it reports', () => {
    process.env.CRON_SECRET = 'super-secret-value'
    process.env.DATABASE_URL = 'postgresql://user:password@host/db'

    const output = [...describeGaps(), JSON.stringify(checkConfiguration())].join(' ')
    expect(output).not.toContain('super-secret-value')
    expect(output).not.toContain('password')
  })

  it('describes each gap in terms of what is lost', () => {
    const gaps = describeGaps()
    expect(gaps.length).toBeGreaterThan(0)
    for (const gap of gaps) {
      expect(gap).toMatch(/^(CRITICAL|DEGRADED):/)
      expect(gap.length).toBeGreaterThan(40)
    }
  })
})
