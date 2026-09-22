// Configuration checks.
//
// Several features fail silently when their environment variable is missing —
// the cron endpoint returns 503 and no bill reminder, alert, round-up or
// snapshot ever runs, and nothing anywhere says so. Every one of those is a
// feature the user believes they have.
//
// This turns a silent nothing into a named, visible gap.

export type Severity = 'critical' | 'degraded' | 'optional'

export type ConfigCheck = {
  key: string
  severity: Severity
  /** What stops working, in terms of what the user loses. */
  impact: string
  configured: boolean
}

type Requirement = {
  /** All of these must be present for the feature to work. */
  keys: string[]
  severity: Severity
  impact: string
}

const REQUIREMENTS: Requirement[] = [
  {
    keys: ['DATABASE_URL'],
    severity: 'critical',
    impact: 'Nothing works — the app cannot reach its database.',
  },
  {
    keys: ['NEXTAUTH_SECRET'],
    severity: 'critical',
    impact: 'Sessions cannot be signed, so nobody can stay signed in.',
  },
  {
    keys: ['ENCRYPTION_KEY'],
    severity: 'critical',
    impact: 'Bank tokens cannot be encrypted or read, so no account can sync.',
  },
  {
    keys: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
    severity: 'critical',
    impact: 'Banks cannot be linked and transactions never import.',
  },
  {
    keys: ['CRON_SECRET'],
    severity: 'critical',
    // The one that hurts most: everything scheduled stops, and the only
    // symptom is that reminders never arrive.
    impact:
      'Nothing scheduled runs: no bill reminders, spending alerts, round-ups, net-worth snapshots or data retention.',
  },
  {
    keys: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    severity: 'degraded',
    impact:
      'Rate limits fall back to per-instance memory, which gives almost no protection against a distributed attempt on sign-in.',
  },
  {
    keys: ['RESEND_API_KEY'],
    severity: 'degraded',
    impact:
      'Email falls back to SMTP. Password resets and verification links are likely to land in spam, locking people out.',
  },
  {
    keys: ['ANTHROPIC_API_KEY'],
    severity: 'degraded',
    impact: 'The assistant, spending analysis and tips are unavailable.',
  },
  {
    keys: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    severity: 'degraded',
    impact: 'Push notifications are never delivered; alerts only appear in the app.',
  },
  {
    keys: ['SENTRY_DSN'],
    severity: 'optional',
    impact: 'Errors are logged but nobody is notified when production breaks.',
  },
  {
    keys: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PLUS', 'STRIPE_PRICE_PRO'],
    severity: 'optional',
    impact: 'Nobody can upgrade — billing is disabled and plan limits are permanent.',
  },
]

function isSet(key: string): boolean {
  const value = process.env[key]
  return typeof value === 'string' && value.trim().length > 0
}

export function checkConfiguration(): ConfigCheck[] {
  return REQUIREMENTS.map((req) => ({
    // A requirement with several keys is reported under all of them, because
    // half-configured is as broken as not configured.
    key: req.keys.join(' + '),
    severity: req.severity,
    impact: req.impact,
    configured: req.keys.every(isSet),
  }))
}

export type ConfigSummary = {
  ok: boolean
  missingCritical: ConfigCheck[]
  missingDegraded: ConfigCheck[]
  missingOptional: ConfigCheck[]
}

export function summariseConfiguration(): ConfigSummary {
  const checks = checkConfiguration()
  const missing = (severity: Severity) =>
    checks.filter((c) => !c.configured && c.severity === severity)

  const missingCritical = missing('critical')

  return {
    // Only a critical gap makes the deployment "not ok" — a missing Stripe key
    // is a decision, not a fault, and should not page anyone at 3am.
    ok: missingCritical.length === 0,
    missingCritical,
    missingDegraded: missing('degraded'),
    missingOptional: missing('optional'),
  }
}

/**
 * A short line per gap, for the boot log.
 *
 * Deliberately never prints a value — only whether a key is set — so this is
 * safe in a log aggregator that other people can read.
 */
export function describeGaps(): string[] {
  const { missingCritical, missingDegraded } = summariseConfiguration()
  return [...missingCritical, ...missingDegraded].map(
    (c) => `${c.severity.toUpperCase()}: ${c.key} is not set — ${c.impact}`
  )
}
