import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isDeveloperEmail, developerModeConfigured } from '@/lib/plans'
import { logger } from '@/lib/logger'
import { seedInto } from '../../../../../scripts/seed-demo-bank.mjs'

// Seeds the signed-in developer's own account with a year of transactions.
//
// This exists because the seeder needs database credentials, and the only
// place those live is the deployment. Running it here means the same code that
// runs locally runs against the real database, rather than a second
// implementation that drifts from the first.
//
// Three things keep it safe to have in a deployed app:
//   • it is refused unless DEVELOPER_EMAILS is configured at all, so it is
//     inert on any deployment that has not deliberately turned it on;
//   • it seeds the caller's own account and takes no target, so it cannot be
//     pointed at someone else;
//   • it removes only rows tagged as seeded, so a real linked bank on the
//     same account survives it.
//
// POST, never GET: a link that rewrites an account on visit is a link someone
// will eventually click by accident.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Not "forbidden" by accident — an app with no developer allow-list should
  // behave as though this route does not exist.
  if (!developerModeConfigured() || !isDeveloperEmail(session.user.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const result = await seedInto(prisma, user)

    logger.info('Demo bank seeded', { userId: user.id, transactions: result.transactions })

    return NextResponse.json(
      { seeded: true, email: user.email, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    // The most likely failure is a missing ENCRYPTION_KEY, and the message
    // says which setting rather than leaving a bare 500 to guess at.
    const message = err instanceof Error ? err.message : 'Seeding failed'
    logger.error('Demo seed failed', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
