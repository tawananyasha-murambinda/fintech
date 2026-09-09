import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Data retention (GDPR Article 5(1)(e): personal data kept no longer than
// necessary). Every window is expressed here rather than inline at the call
// site so the retention schedule is one readable table that can be handed to
// a reviewer alongside the privacy policy.
//
// Anything that deletes user-visible financial history is deliberately absent:
// transactions, budgets, goals, bills and tax entries are the product, and are
// removed only when the user deletes their account.
export const RETENTION_DAYS = {
  /** Sign-ups that never confirmed their email address. */
  unverifiedAccounts: 30,
  /** One-time email verification and password-reset tokens. */
  expiredTokens: 7,
  /** Read in-app notifications. */
  readNotifications: 90,
  /** Dismissed or stale alerts. */
  staleAlerts: 180,
  /** Client-side error reports. */
  errorLogs: 90,
  /** Stripe webhook idempotency records — only needed for Stripe's retry window. */
  billingEvents: 30,
  /** AI chat transcripts. */
  chatMessages: 365,
  /** Per-day AI usage counters. */
  aiUsage: 90,
  /**
   * Two-factor recovery codes that have already been used. The unused ones are
   * live credentials and are never swept.
   */
  usedRecoveryCodes: 365,
  /**
   * Security audit log. Longest window by design: it is the record of who
   * accessed and changed an account, which is exactly what an incident
   * investigation needs.
   */
  auditLogs: 730,
} as const

export type RetentionReport = {
  deleted: Record<string, number>
  failed: string[]
}

function cutoff(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export async function runRetention(now: Date = new Date()): Promise<RetentionReport> {
  const deleted: Record<string, number> = {}
  const failed: string[] = []

  const sweep = async (name: string, fn: () => Promise<{ count: number }>) => {
    try {
      const { count } = await fn()
      deleted[name] = count
    } catch (err) {
      failed.push(name)
      logger.error(`Retention sweep "${name}" failed`, { error: err })
    }
  }

  // Unverified sign-ups. Cascading deletes remove anything they created.
  // `emailVerified: null` alone is not enough — OAuth users are verified on
  // the provider side, so only password accounts are in scope.
  await sweep('unverifiedAccounts', () =>
    prisma.user.deleteMany({
      where: {
        emailVerified: null,
        password: { not: null },
        createdAt: { lt: cutoff(RETENTION_DAYS.unverifiedAccounts, now) },
      },
    })
  )

  await sweep('expiredTokens', () =>
    prisma.verificationToken.deleteMany({
      where: { expires: { lt: cutoff(RETENTION_DAYS.expiredTokens, now) } },
    })
  )

  await sweep('readNotifications', () =>
    prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: cutoff(RETENTION_DAYS.readNotifications, now) },
      },
    })
  )

  await sweep('staleAlerts', () =>
    prisma.alert.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.staleAlerts, now) } },
    })
  )

  await sweep('errorLogs', () =>
    prisma.errorLog.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.errorLogs, now) } },
    })
  )

  await sweep('billingEvents', () =>
    prisma.billingEvent.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.billingEvents, now) } },
    })
  )

  await sweep('chatMessages', () =>
    prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.chatMessages, now) } },
    })
  )

  // AiUsage is keyed by a YYYY-MM-DD string rather than a timestamp. That
  // format sorts lexicographically, and the column is indexed, so a string
  // comparison is both correct and cheap.
  await sweep('aiUsage', () =>
    prisma.aiUsage.deleteMany({
      where: { date: { lt: cutoff(RETENTION_DAYS.aiUsage, now).toISOString().slice(0, 10) } },
    })
  )

  await sweep('usedRecoveryCodes', () =>
    prisma.twoFactorRecoveryCode.deleteMany({
      where: {
        usedAt: { not: null, lt: cutoff(RETENTION_DAYS.usedRecoveryCodes, now) },
      },
    })
  )

  await sweep('auditLogs', () =>
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.auditLogs, now) } },
    })
  )

  const total = Object.values(deleted).reduce((a, b) => a + b, 0)
  logger.info('Retention sweep complete', { total, deleted, failed })

  return { deleted, failed }
}
