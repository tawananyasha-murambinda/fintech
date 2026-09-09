import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sum, round, subtract } from '@/lib/money'

// Net worth over time.
//
// Assets and liabilities carry only a current value, so before this the
// net-worth screen could answer "what am I worth today" and nothing else. A
// nightly snapshot turns it into a trend — which is the question people
// actually have: is this going the right way, and how fast.

export type NetWorthComponents = {
  assets: number
  liabilities: number
  netWorth: number
  cash: number
  investments: number
}

export async function computeNetWorth(userId: string): Promise<NetWorthComponents> {
  const [assets, liabilities, investments, banks] = await Promise.all([
    prisma.asset.findMany({ where: { userId }, select: { value: true } }),
    prisma.liability.findMany({ where: { userId }, select: { balance: true } }),
    prisma.investment.findMany({
      where: { userId },
      select: { shares: true, currentPrice: true, costBasis: true },
    }),
    prisma.linkedBank.findMany({
      where: { userId },
      select: { accountType: true },
    }),
  ])

  // Market value where a live price is known, cost basis otherwise — better a
  // stale figure than silently valuing a holding at zero.
  const investmentValue = sum(
    investments.map((i) =>
      i.shares !== null && i.currentPrice !== null ? i.shares * i.currentPrice : (i.costBasis ?? 0)
    )
  )

  const assetTotal = sum(assets.map((a) => a.value))
  const liabilityTotal = sum(liabilities.map((l) => l.balance))

  // Cash is not modelled as a balance anywhere yet, so it is reported as zero
  // rather than guessed at. Kept as its own column so it can be filled in
  // without a second migration once account balances are stored.
  void banks

  return {
    assets: round(assetTotal + investmentValue),
    liabilities: liabilityTotal,
    netWorth: subtract(assetTotal + investmentValue, liabilityTotal),
    cash: 0,
    investments: investmentValue,
  }
}

function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** Records today's snapshot. Idempotent — re-running updates the same row. */
export async function snapshotNetWorth(userId: string, now = new Date()): Promise<void> {
  const components = await computeNetWorth(userId)

  await prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date: dateKey(now) } },
    update: components,
    create: { userId, date: dateKey(now), ...components },
  })
}

/** Snapshots every user who has anything worth snapshotting. */
export async function snapshotAllNetWorth(now = new Date()): Promise<{
  users: number
  failed: number
}> {
  // Only users with at least one asset, liability or investment — there is no
  // value in recording a run of zeroes for everyone else.
  const [assetUsers, liabilityUsers, investmentUsers] = await Promise.all([
    prisma.asset.findMany({ select: { userId: true }, distinct: ['userId'] }),
    prisma.liability.findMany({ select: { userId: true }, distinct: ['userId'] }),
    prisma.investment.findMany({ select: { userId: true }, distinct: ['userId'] }),
  ])

  const userIds = [
    ...new Set([...assetUsers, ...liabilityUsers, ...investmentUsers].map((r) => r.userId)),
  ]

  let failed = 0
  for (const userId of userIds) {
    try {
      await snapshotNetWorth(userId, now)
    } catch (err) {
      failed++
      logger.error('Net worth snapshot failed', { userId, error: err })
    }
  }

  return { users: userIds.length, failed }
}

export type NetWorthTrend = {
  points: { date: string; netWorth: number; assets: number; liabilities: number }[]
  change: number | null
  changePercent: number | null
  /** Average movement per month over the window, for a plain-English readout. */
  monthlyRate: number | null
  periodDays: number
}

/** The trend over the last `days`, plus how much it moved. */
export async function netWorthTrend(userId: string, days = 365): Promise<NetWorthTrend> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, netWorth: true, assets: true, liabilities: true },
  })

  if (snapshots.length < 2) {
    return {
      points: snapshots,
      change: null,
      changePercent: null,
      monthlyRate: null,
      periodDays: days,
    }
  }

  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const change = subtract(last.netWorth, first.netWorth)

  const elapsedDays = Math.max(
    1,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000
  )

  return {
    points: snapshots,
    change,
    // Guarded: a net worth that starts at or below zero makes a percentage
    // meaningless rather than merely large.
    changePercent: first.netWorth > 0 ? round((change / first.netWorth) * 100) : null,
    monthlyRate: round((change / elapsedDays) * 30),
    periodDays: Math.round(elapsedDays),
  }
}
