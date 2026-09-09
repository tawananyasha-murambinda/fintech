import { prisma } from '@/lib/prisma'
import { syncLinkedBank } from '@/lib/bank-sync'
import { generateAlertsForUser } from '@/lib/alerts'
import { runBillReminders, MS_PER_DAY } from '@/lib/bill-reminders'
import { runRetention } from '@/lib/retention'
import { runAllRoundUps } from '@/lib/round-ups'
import { snapshotAllNetWorth } from '@/lib/net-worth-history'
import { logger } from '@/lib/logger'

// Banks are normally kept fresh by the Plaid webhook. This sweep is the
// safety net for webhooks that were dropped, arrived while the app was down,
// or were never sent because the item needs re-authentication.
const STALE_AFTER_HOURS = 24

export async function resyncStaleBanks(now: Date = new Date()): Promise<{
  attempted: number
  synced: number
  failed: number
  transactions: number
}> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_HOURS * 60 * 60 * 1000)

  const banks = await prisma.linkedBank.findMany({
    where: {
      OR: [{ lastSynced: null }, { lastSynced: { lt: cutoff } }],
    },
  })

  let synced = 0
  let failed = 0
  let transactions = 0

  for (const bank of banks) {
    try {
      const result = await syncLinkedBank(bank as any)
      if (result.error) {
        failed++
        logger.warn('Stale bank resync reported an error', { bankId: bank.id, error: result.error })
      } else {
        synced++
        transactions += result.imported
      }
    } catch (err) {
      failed++
      logger.error('Stale bank resync threw', { bankId: bank.id, error: err })
    }
  }

  return { attempted: banks.length, synced, failed, transactions }
}

// Alerts used to be generated only when someone opened the dashboard, which
// meant the users least likely to notice an overspend were the ones who never
// got told about it. Scoped to users with recent activity so the sweep does
// not scan the entire table every night.
export async function generateAlertsForActiveUsers(now: Date = new Date()): Promise<{
  users: number
  alerts: number
  failed: number
}> {
  const since = new Date(now.getTime() - 30 * MS_PER_DAY)

  const rows = await prisma.transaction.findMany({
    where: { date: { gte: since } },
    select: { userId: true },
    distinct: ['userId'],
  })

  let alerts = 0
  let failed = 0

  for (const { userId } of rows) {
    try {
      const created = await generateAlertsForUser(userId)
      alerts += created.length
    } catch (err) {
      failed++
      logger.error('Scheduled alert generation failed', { userId, error: err })
    }
  }

  return { users: rows.length, alerts, failed }
}

export type DailyJobReport = {
  startedAt: string
  finishedAt: string
  durationMs: number
  billReminders: Awaited<ReturnType<typeof runBillReminders>> | { error: string }
  staleBanks: Awaited<ReturnType<typeof resyncStaleBanks>> | { error: string }
  alerts: Awaited<ReturnType<typeof generateAlertsForActiveUsers>> | { error: string }
  roundUps: Awaited<ReturnType<typeof runAllRoundUps>> | { error: string }
  netWorthSnapshots: Awaited<ReturnType<typeof snapshotAllNetWorth>> | { error: string }
  retention: Awaited<ReturnType<typeof runRetention>> | { error: string }
}

// Each job is isolated: one failing (a Plaid outage, say) must not stop bill
// reminders from going out.
export async function runDailyJobs(now: Date = new Date()): Promise<DailyJobReport> {
  const startedAt = Date.now()

  const settle = async <T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> => {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error(`Daily job "${name}" failed`, { error: err })
      return { error: message }
    }
  }

  const billReminders = await settle('billReminders', () => runBillReminders(now))
  const staleBanks = await settle('staleBanks', () => resyncStaleBanks(now))
  const alerts = await settle('alerts', () => generateAlertsForActiveUsers(now))
  // After the sync, so today's transactions are swept in the same run.
  const roundUps = await settle('roundUps', () => runAllRoundUps())
  // Recorded before retention so a snapshot always reflects a full day.
  const netWorthSnapshots = await settle('netWorthSnapshots', () => snapshotAllNetWorth(now))
  // Retention runs last: it deletes rows the jobs above may have just read,
  // and a failure here must not cost anyone their bill reminder.
  const retention = await settle('retention', () => runRetention(now))

  const finished = Date.now()
  const report: DailyJobReport = {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - startedAt,
    billReminders,
    staleBanks,
    alerts,
    roundUps,
    netWorthSnapshots,
    retention,
  }

  logger.info('Daily jobs complete', report)
  return report
}
