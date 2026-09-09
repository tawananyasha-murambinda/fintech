import { round } from '@/lib/money'

// Debt payoff projection.
//
// The previous calculator took a `strategy` argument and never used it: every
// debt was amortised in isolation, so snowball and avalanche produced
// identical numbers and the strategy picker only reordered a list. The whole
// point of either strategy is the rollover — when one debt clears, its payment
// joins the next one, which is what makes extra payments compound.
//
// It also had a `months < 600` loop guard that quietly hid the case that
// matters most: when the minimum payment does not cover the monthly interest,
// the balance never falls. That reported "600 months" and a large but finite
// interest figure for a debt that is mathematically never paid off.

export type Strategy = 'snowball' | 'avalanche'

export type DebtInput = {
  id: string
  name: string
  balance: number
  /** Annual percentage rate. */
  interestRate: number | null
  minPayment: number | null
}

export type DebtPayoff = {
  id: string
  name: string
  balance: number
  months: number
  /** Month index the debt clears, counted from now. */
  clearedInMonth: number
  interestPaid: number
  totalPaid: number
  payoffDate: string
}

export type PayoffPlan = {
  strategy: Strategy
  order: string[]
  months: number
  totalInterest: number
  totalPaid: number
  payoffDate: string | null
  perDebt: DebtPayoff[]
  /** Debts whose minimum payment does not cover their monthly interest. */
  neverPaidOff: { id: string; name: string; shortfall: number }[]
  feasible: boolean
}

const MAX_MONTHS = 600

/** Minimum payment that at least covers interest, when none is recorded. */
function assumedMinPayment(balance: number, monthlyRate: number): number {
  // Card issuers typically ask for ~2% of the balance, floored at a few units.
  return Math.max(balance * 0.02, balance * monthlyRate + 10, 25)
}

/**
 * Runs the full portfolio month by month under one strategy.
 *
 * Every debt receives its minimum each month. `extraPayment`, plus the freed
 * minimums of any debt already cleared, all go to the single target debt
 * chosen by the strategy — highest rate for avalanche, smallest balance for
 * snowball.
 */
export function buildPayoffPlan(
  debts: DebtInput[],
  extraPayment: number,
  strategy: Strategy
): PayoffPlan {
  const active = debts
    .filter((d) => d.balance > 0)
    .map((d) => {
      const monthlyRate = (d.interestRate ?? 0) / 100 / 12
      return {
        id: d.id,
        name: d.name,
        startingBalance: d.balance,
        balance: d.balance,
        monthlyRate,
        minPayment: d.minPayment && d.minPayment > 0 ? d.minPayment : assumedMinPayment(d.balance, monthlyRate),
        interestPaid: 0,
        clearedInMonth: 0,
      }
    })

  if (active.length === 0) {
    return {
      strategy,
      order: [],
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      payoffDate: null,
      perDebt: [],
      neverPaidOff: [],
      feasible: true,
    }
  }

  // A debt whose minimum does not cover its own interest can never clear on
  // that payment, and no rollover can reach it while it is not the target.
  // Surface it as a fact rather than burning 600 iterations to hide it.
  const totalBudget = active.reduce((s, d) => s + d.minPayment, 0) + extraPayment
  const totalInterestPerMonth = active.reduce((s, d) => s + d.balance * d.monthlyRate, 0)

  const neverPaidOff =
    totalBudget <= totalInterestPerMonth
      ? active.map((d) => ({
          id: d.id,
          name: d.name,
          shortfall: round(d.balance * d.monthlyRate - d.minPayment),
        }))
      : []

  if (neverPaidOff.length > 0) {
    return {
      strategy,
      order: active.map((d) => d.id),
      months: Infinity,
      totalInterest: Infinity,
      totalPaid: Infinity,
      payoffDate: null,
      perDebt: [],
      neverPaidOff,
      feasible: false,
    }
  }

  const order = (): typeof active =>
    [...active]
      .filter((d) => d.balance > 0.005)
      .sort((a, b) =>
        strategy === 'avalanche'
          ? b.monthlyRate - a.monthlyRate || a.balance - b.balance
          : a.balance - b.balance || b.monthlyRate - a.monthlyRate
      )

  const payoffOrder = order().map((d) => d.id)
  let month = 0

  while (active.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month++

    // Interest first, on every outstanding debt.
    for (const debt of active) {
      if (debt.balance <= 0.005) continue
      const interest = debt.balance * debt.monthlyRate
      debt.interestPaid += interest
      debt.balance += interest
    }

    // Minimums, then everything left over onto the target.
    let pool = extraPayment
    for (const debt of active) {
      if (debt.balance <= 0.005) {
        // A cleared debt's minimum rolls into the pool — the snowball effect.
        pool += debt.minPayment
        continue
      }
      const payment = Math.min(debt.minPayment, debt.balance)
      debt.balance -= payment
      pool += debt.minPayment - payment
    }

    const remaining = order()
    for (const target of remaining) {
      if (pool <= 0.005) break
      const payment = Math.min(pool, target.balance)
      target.balance -= payment
      pool -= payment
    }

    for (const debt of active) {
      if (debt.balance <= 0.005 && debt.clearedInMonth === 0) {
        debt.balance = 0
        debt.clearedInMonth = month
      }
    }
  }

  const now = new Date()
  const dateAfter = (months: number) =>
    new Date(now.getFullYear(), now.getMonth() + months, now.getDate()).toISOString()

  const perDebt: DebtPayoff[] = active.map((d) => ({
    id: d.id,
    name: d.name,
    balance: round(d.startingBalance),
    months: d.clearedInMonth,
    clearedInMonth: d.clearedInMonth,
    interestPaid: round(d.interestPaid),
    totalPaid: round(d.startingBalance + d.interestPaid),
    payoffDate: dateAfter(d.clearedInMonth),
  }))

  const totalInterest = round(active.reduce((s, d) => s + d.interestPaid, 0))
  const totalPaid = round(active.reduce((s, d) => s + d.startingBalance + d.interestPaid, 0))

  return {
    strategy,
    order: payoffOrder,
    months: month,
    totalInterest,
    totalPaid,
    payoffDate: dateAfter(month),
    perDebt,
    neverPaidOff: [],
    feasible: true,
  }
}

/** What the extra payment buys, versus paying minimums only. */
export function comparePlans(debts: DebtInput[], extraPayment: number, strategy: Strategy) {
  const withExtra = buildPayoffPlan(debts, extraPayment, strategy)
  const minimumsOnly = buildPayoffPlan(debts, 0, strategy)

  const bothFeasible = withExtra.feasible && minimumsOnly.feasible

  return {
    withExtra,
    minimumsOnly,
    monthsSaved: bothFeasible ? minimumsOnly.months - withExtra.months : null,
    interestSaved: bothFeasible ? round(minimumsOnly.totalInterest - withExtra.totalInterest) : null,
  }
}

/** Which strategy actually costs less for this particular portfolio. */
export function compareStrategies(debts: DebtInput[], extraPayment: number) {
  const avalanche = buildPayoffPlan(debts, extraPayment, 'avalanche')
  const snowball = buildPayoffPlan(debts, extraPayment, 'snowball')

  if (!avalanche.feasible || !snowball.feasible) {
    return { avalanche, snowball, cheaper: null, interestDifference: null }
  }

  return {
    avalanche,
    snowball,
    // Avalanche is mathematically never worse on interest; the gap is what
    // tells the user whether snowball's motivational ordering is worth it.
    cheaper: avalanche.totalInterest <= snowball.totalInterest ? 'avalanche' : 'snowball',
    interestDifference: round(Math.abs(snowball.totalInterest - avalanche.totalInterest)),
  }
}
