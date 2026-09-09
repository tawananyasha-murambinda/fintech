import { prisma } from '@/lib/prisma'
import { notifyBillReminder } from '@/lib/notifications'
import { sendPushNotification } from '@/lib/push-notifications'
import { logger } from '@/lib/logger'
import { nextDueDate, daysUntilDue } from '@/lib/bills'

export const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ReminderCandidate = {
  reminderDays: number
  lastReminded: Date | null
  dueDate: number
  frequency?: string | null
  anchorDate?: Date | null
}

/**
 * True when the bill is inside its reminder window and has not already been
 * reminded about *this* occurrence.
 *
 * `lastReminded` is compared against the moment the current window opened
 * rather than a fixed number of days, so a bill reminds once per cycle no
 * matter how often the sweep runs — and reminds again next cycle, which a
 * simple "reminded recently?" check would suppress.
 */
export function shouldRemind(bill: ReminderCandidate, now: Date = new Date()): boolean {
  const due = nextDueDate(bill, now)
  const days = daysUntilDue(due, now)
  if (days < 0 || days > bill.reminderDays) return false
  if (!bill.lastReminded) return true

  const windowOpensAt = new Date(due.getTime() - bill.reminderDays * MS_PER_DAY)
  return bill.lastReminded < windowOpensAt
}

export type ReminderRun = { sent: number; failed: number }

// Sweeps every active bill and notifies owners whose bills fall inside their
// reminder window. Safe to run repeatedly: `lastReminded` makes it idempotent
// within a billing cycle.
export async function runBillReminders(now: Date = new Date()): Promise<ReminderRun> {
  const bills = await prisma.bill.findMany({
    where: { isActive: true },
    select: {
      id: true,
      userId: true,
      name: true,
      amount: true,
      dueDate: true,
      frequency: true,
      anchorDate: true,
      reminderDays: true,
      lastReminded: true,
    },
  })

  let sent = 0
  let failed = 0

  for (const bill of bills) {
    if (!shouldRemind(bill, now)) continue

    const days = daysUntilDue(nextDueDate(bill, now), now)
    try {
      await notifyBillReminder(bill.userId, bill.name, bill.amount, days)
      await sendPushNotification(bill.userId, {
        title: days === 0 ? 'Bill due today' : `Bill due in ${days} day${days > 1 ? 's' : ''}`,
        body: `${bill.name} — $${bill.amount.toFixed(2)}`,
        tag: `bill-${bill.id}`,
        url: '/dashboard/bills',
      })
      // Stamped only after a successful notification so a failure retries
      // on the next run instead of being silently swallowed for the cycle.
      await prisma.bill.update({ where: { id: bill.id }, data: { lastReminded: now } })
      sent++
    } catch (err) {
      failed++
      logger.error('Bill reminder failed', { billId: bill.id, error: err })
    }
  }

  return { sent, failed }
}
