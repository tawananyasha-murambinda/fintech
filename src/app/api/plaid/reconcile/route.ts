import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/plaid/reconcile — diagnostics report comparing linked-bank data
// against manual entries, flagging pending/uncategorized/stale items.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [banks, transactions, manualTransactions] = await Promise.all([
      prisma.linkedBank.findMany({
        where: { userId: session.user.id },
        select: { id: true, institutionName: true, accountName: true, lastSynced: true, createdAt: true },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        select: { amount: true, direction: true, status: true, merchantCategory: true, date: true },
      }),
      prisma.manualTransaction.findMany({
        where: { userId: session.user.id },
        select: { amount: true, direction: true, date: true },
      }),
    ])

    const now = Date.now()
    const bankReport = banks.map((b) => {
      const stale = b.lastSynced ? now - b.lastSynced.getTime() : null
      return {
        id: b.id,
        institutionName: b.institutionName,
        accountName: b.accountName,
        lastSynced: b.lastSynced,
        stalenessHours: stale === null ? null : Math.round(stale / 3600000),
        needsResync: stale === null || stale > 48 * 3600000,
      }
    })

    const posted = transactions.filter((t) => t.status === 'posted')
    const pending = transactions.filter((t) => t.status === 'pending')
    const uncategorized = posted.filter((t) => !t.merchantCategory)

    const sum = (items: { amount: number; direction: string }[]) =>
      items.reduce(
        (acc, t) => {
          if (t.direction === 'debit') acc.debits += Math.abs(t.amount)
          else acc.credits += Math.abs(t.amount)
          return acc
        },
        { debits: 0, credits: 0 }
      )

    const postedTotals = sum(posted)
    const manualTotals = sum(manualTransactions)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      banks: bankReport,
      totals: {
        postedDebits: Math.round(postedTotals.debits * 100) / 100,
        postedCredits: Math.round(postedTotals.credits * 100) / 100,
        manualDebits: Math.round(manualTotals.debits * 100) / 100,
        manualCredits: Math.round(manualTotals.credits * 100) / 100,
      },
      counts: {
        transactions: transactions.length,
        posted: posted.length,
        pending: pending.length,
        uncategorized: uncategorized.length,
        manual: manualTransactions.length,
      },
      pendingAmount: Math.round(pending.reduce((s, t) => s + Math.abs(t.amount), 0) * 100) / 100,
      uncategorizedAmount: Math.round(uncategorized.reduce((s, t) => s + Math.abs(t.amount), 0) * 100) / 100,
      flags: [
        ...bankReport.filter((b) => b.needsResync).map((b) => `${b.institutionName} has not synced in ${b.stalenessHours} hours.`),
        ...(uncategorized.length > 0 ? [`${uncategorized.length} posted transactions are uncategorized.`] : []),
        ...(pending.length > 0 ? [`${pending.length} transactions are still pending.`] : []),
      ],
    })
  } catch (err) {
    logger.error('Reconciliation failed', { userId: session.user.id })
    const { error, status } = errorResponse(err, 'We could not run the reconciliation check right now.')
    return NextResponse.json({ error }, { status })
  }
}
