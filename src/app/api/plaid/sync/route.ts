import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncAllForUser } from '@/lib/bank-sync'
import { logAudit, requestMeta } from '@/lib/audit'
import { runRoundUpsForUser } from '@/lib/round-ups'
import { logger } from '@/lib/logger'

// POST /api/plaid/sync — pull latest transactions for all linked accounts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const banks = await prisma.linkedBank.findMany({
    where: { userId: session.user.id },
  })

  if (!banks.length) {
    return NextResponse.json({ synced: 0, transactions: 0, failed: 0 })
  }

  const { synced, transactions, failed } = await syncAllForUser(session.user.id)

  await logAudit(session.user.id, 'bank.sync', {
    ...requestMeta(req),
    metadata: { synced, transactions, failed },
  })

  if (failed > 0 && synced === 0) {
    return NextResponse.json(
      { synced: 0, transactions: 0, failed, error: 'Could not sync your bank accounts. Please try again or re-link your bank.' },
      { status: 502 }
    )
  }

  // New transactions may be eligible for round-ups. Best-effort: a failure
  // here must not turn a successful sync into an error for the user.
  let roundUps = { swept: 0, contributed: 0 }
  if (transactions > 0) {
    try {
      const result = await runRoundUpsForUser(session.user.id)
      roundUps = { swept: result.swept, contributed: result.contributed }
    } catch (err) {
      logger.error('Round-up sweep after sync failed', { userId: session.user.id, error: err })
    }
  }

  return NextResponse.json({ synced, transactions, failed, roundUps })
}
