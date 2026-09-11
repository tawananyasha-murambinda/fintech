import { prisma } from '@/lib/prisma'
import { round, sum, subtract } from '@/lib/money'
import { nextDueDate, daysUntilDue } from '@/lib/bills'
import { detectIncomeStreams, nextPayday, type IncomeStream } from '@/lib/recurring-income'

// Safe to spend.
//
// The number people actually want: what is left once the money that is already
// promised to something else is taken out, and how long it has to last.
//
// Everything here is deliberately conservative. Over-stating what is spendable
// is the one failure mode that costs the user real money, so where a figure is
// uncertain it is excluded and said to be excluded rather than estimated.

const DAY_MS = 24 * 60 * 60 * 1000

export type SafeToSpend = {
  /** Sum of balances the bank actually reported. */
  balance: number
  /** Null when no account has reported one — never a stand-in zero. */
  hasBalance: boolean
  accountsWithoutBalance: number

  /** Bills falling due before the next payday. */
  committed: number
  upcomingBills: { name: string; amount: number; dueIn: number; dueDate: string }[]

  /** What is genuinely free to spend. */
  safeToSpend: number

  nextPayday: { date: string; source: string; amount: number; daysAway: number } | null
  /** Days the money has to cover. Falls back to end-of-month with no payday. */
  daysToCover: number
  dailyAllowance: number

  incomeStreams: IncomeStream[]
  /**
   * Why the figure might not be trustworthy. Shown to the user rather than
   * hidden, because a confident wrong number is worse than a hedged one.
   */
  caveats: string[]
}

export async function computeSafeToSpend(
  userId: string,
  now: Date = new Date()
): Promise<SafeToSpend> {
  const [banks, bills, transactions] = await Promise.all([
    prisma.linkedBank.findMany({
      where: { userId },
      select: { currentBalance: true, currency: true, accountName: true },
    }),
    prisma.bill.findMany({ where: { userId, isActive: true } }),
    prisma.transaction.findMany({
      where: {
        userId,
        direction: 'credit',
        date: { gte: new Date(now.getTime() - 400 * DAY_MS) },
      },
      select: { merchantName: true, description: true, amount: true, date: true, direction: true },
      take: 2000,
    }),
  ])

  const caveats: string[] = []

  const priced = banks.filter((b) => b.currentBalance !== null)
  const balance = sum(priced.map((b) => b.currentBalance ?? 0))
  const accountsWithoutBalance = banks.length - priced.length

  if (accountsWithoutBalance > 0) {
    caveats.push(
      `${accountsWithoutBalance} account${accountsWithoutBalance > 1 ? 's have' : ' has'} no reported balance and ${accountsWithoutBalance > 1 ? 'are' : 'is'} not counted.`
    )
  }

  // Mixed currencies are summed as-is. Converting would need a rate and would
  // make the headline figure depend on one; saying so is more honest.
  const currencies = new Set(priced.map((b) => b.currency))
  if (currencies.size > 1) {
    caveats.push('Accounts are in different currencies and have been added without conversion.')
  }

  const { streams } = detectIncomeStreams(transactions, now)
  const payday = nextPayday(streams, now)

  if (!payday) {
    caveats.push(
      streams.length === 0
        ? 'No regular income found yet, so this counts to the end of the month instead of to payday.'
        : 'Your income is not regular enough to predict a payday, so this counts to the end of the month.'
    )
  }

  // Without a payday, the end of the month is the honest horizon: it is the
  // period budgets and most bills already work to.
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const horizon = payday ? payday.date : endOfMonth
  const daysToCover = Math.max(1, Math.ceil((horizon.getTime() - now.getTime()) / DAY_MS))

  // Only bills landing inside the window are committed. A bill due the day
  // after payday is paid from that money, not from this.
  const upcomingBills = bills
    .map((bill) => {
      const due = nextDueDate(bill, now)
      return {
        name: bill.name,
        amount: bill.amount,
        dueIn: daysUntilDue(due, now),
        dueDate: due.toISOString(),
      }
    })
    .filter((b) => b.dueIn >= 0 && b.dueIn <= daysToCover)
    .sort((a, b) => a.dueIn - b.dueIn)

  const committed = sum(upcomingBills.map((b) => b.amount))
  const safeToSpend = subtract(balance, committed)

  if (safeToSpend < 0) {
    caveats.push('Your committed bills come to more than your balance before the next payday.')
  }

  return {
    balance,
    hasBalance: priced.length > 0,
    accountsWithoutBalance,
    committed,
    upcomingBills,
    safeToSpend,
    nextPayday: payday
      ? {
          date: payday.date.toISOString(),
          source: payday.source,
          amount: payday.amount,
          daysAway: Math.max(0, Math.ceil((payday.date.getTime() - now.getTime()) / DAY_MS)),
        }
      : null,
    daysToCover,
    // Negative safe-to-spend means there is nothing to divide up; a negative
    // daily allowance would be nonsense.
    dailyAllowance: safeToSpend > 0 ? round(safeToSpend / daysToCover) : 0,
    incomeStreams: streams,
    caveats,
  }
}
