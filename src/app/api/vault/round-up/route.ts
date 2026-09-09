import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runRoundUpsForUser } from '@/lib/round-ups'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vaultId, enabled, roundTo, maxPerTransaction } = await req.json()

  // Guard the tunables: a roundTo of 0 would divide the engine by zero, and a
  // huge one would sweep most of every purchase.
  const parsedRoundTo =
    roundTo === undefined ? undefined : Math.min(Math.max(Number(roundTo) || 1, 0.5), 20)
  const parsedMax =
    maxPerTransaction === undefined || maxPerTransaction === null
      ? undefined
      : Math.max(Number(maxPerTransaction) || 0, 0) || null

  const existing = await prisma.roundUpRule.findFirst({
    where: { userId: session.user.id, isActive: true },
  })

  if (!enabled) {
    if (existing) {
      await prisma.roundUpRule.update({
        where: { id: existing.id },
        data: { isActive: false },
      })
    }
    return NextResponse.json({ enabled: false })
  }

  if (!vaultId) {
    return NextResponse.json({ error: 'Choose a vault to round up into.' }, { status: 400 })
  }

  const vault = await prisma.vault.findFirst({
    where: { id: vaultId, userId: session.user.id, isActive: true },
    select: { id: true },
  })
  if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 })

  const rule = existing
    ? await prisma.roundUpRule.update({
        where: { id: existing.id },
        data: {
          vaultId,
          isActive: true,
          ...(parsedRoundTo !== undefined && { roundTo: parsedRoundTo }),
          ...(parsedMax !== undefined && { maxPerTransaction: parsedMax }),
        },
      })
    : await prisma.roundUpRule.create({
        data: {
          userId: session.user.id,
          vaultId,
          ...(parsedRoundTo !== undefined && { roundTo: parsedRoundTo }),
          ...(parsedMax !== undefined && { maxPerTransaction: parsedMax }),
        },
      })

  // Sweep immediately so enabling the feature does something visible now,
  // rather than looking broken until the nightly job runs.
  let swept = { swept: 0, contributed: 0 }
  try {
    const result = await runRoundUpsForUser(session.user.id)
    swept = { swept: result.swept, contributed: result.contributed }
  } catch (err) {
    logger.error('Initial round-up sweep failed', { userId: session.user.id, error: err })
  }

  return NextResponse.json({ enabled: true, rule, ...swept })
}
