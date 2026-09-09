import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { round, sum } from '@/lib/money'

// Round-up savings.
//
// A rule could be created and toggled, the vault screen read it back, and the
// GDPR export included it — but nothing ever computed a round-up. Enabling it
// did nothing at all, and vault balances never moved. This is the engine that
// was missing.

/**
 * What a single purchase contributes: the gap to the next multiple of
 * `roundTo`. A purchase already on the boundary contributes nothing — rounding
 * £4.00 up to £5.00 would be a £1 charge the user never agreed to.
 */
export function computeRoundUp(
  amount: number,
  roundTo = 1,
  maxPerTransaction: number | null = null
): number {
  const spend = Math.abs(amount)
  const step = roundTo > 0 ? roundTo : 1
  if (!Number.isFinite(spend) || spend <= 0) return 0

  const remainder = round(spend % step)
  if (remainder === 0) return 0

  const contribution = round(step - remainder)
  if (maxPerTransaction !== null && contribution > maxPerTransaction) return round(maxPerTransaction)
  return contribution
}

export type RoundUpRun = { swept: number; contributed: number; vaultId: string | null }

/**
 * Sweeps every not-yet-swept debit into the user's round-up vault.
 *
 * Only transactions posted *after* the rule was created are considered —
 * enabling round-ups should not retroactively move three months of savings
 * without warning. Pending transactions are skipped because their amount can
 * still change; they are picked up once they post.
 */
export async function runRoundUpsForUser(userId: string): Promise<RoundUpRun> {
  const rule = await prisma.roundUpRule.findFirst({
    where: { userId, isActive: true },
  })

  if (!rule?.vaultId) return { swept: 0, contributed: 0, vaultId: null }

  const vault = await prisma.vault.findFirst({
    where: { id: rule.vaultId, userId, isActive: true },
    select: { id: true },
  })
  if (!vault) return { swept: 0, contributed: 0, vaultId: null }

  // `transactionId` is unique on VaultContribution, so a transaction can only
  // ever be swept once even if two sweeps race.
  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      direction: 'debit',
      status: 'posted',
      date: { gte: rule.createdAt },
      contributions: { none: {} },
    },
    select: { id: true, amount: true },
    take: 500,
  })

  const contributions: { transactionId: string; amount: number }[] = []
  for (const transaction of candidates) {
    const amount = computeRoundUp(transaction.amount, rule.roundTo, rule.maxPerTransaction)
    if (amount > 0) contributions.push({ transactionId: transaction.id, amount })
  }

  if (contributions.length === 0) return { swept: 0, contributed: 0, vaultId: vault.id }

  const total = sum(contributions.map((c) => c.amount))

  // The ledger rows and the balance must move together, or a crash between
  // them leaves the vault showing money it cannot account for.
  await prisma.$transaction([
    prisma.vaultContribution.createMany({
      data: contributions.map((c) => ({
        userId,
        vaultId: vault.id,
        transactionId: c.transactionId,
        amount: c.amount,
        source: 'roundup',
      })),
      skipDuplicates: true,
    }),
    prisma.vault.update({
      where: { id: vault.id },
      data: { currentAmount: { increment: total } },
    }),
  ])

  logger.info('Round-ups swept', { userId, count: contributions.length, total })
  return { swept: contributions.length, contributed: total, vaultId: vault.id }
}

/** Sweeps every user with an active rule. Runs nightly from the cron. */
export async function runAllRoundUps(): Promise<{ users: number; contributed: number; failed: number }> {
  const rules = await prisma.roundUpRule.findMany({
    where: { isActive: true, vaultId: { not: null } },
    select: { userId: true },
    distinct: ['userId'],
  })

  let contributed = 0
  let failed = 0

  for (const { userId } of rules) {
    try {
      const result = await runRoundUpsForUser(userId)
      contributed += result.contributed
    } catch (err) {
      failed++
      logger.error('Round-up sweep failed', { userId, error: err })
    }
  }

  return { users: rules.length, contributed: round(contributed), failed }
}
