import { describe, it, expect } from 'vitest'
import { buildPayoffPlan, comparePlans, compareStrategies, type DebtInput } from '../debt'

const card = (over: Partial<DebtInput> = {}): DebtInput => ({
  id: 'card',
  name: 'Credit card',
  balance: 3000,
  interestRate: 22,
  minPayment: 90,
  ...over,
})

const loan = (over: Partial<DebtInput> = {}): DebtInput => ({
  id: 'loan',
  name: 'Car loan',
  balance: 8000,
  interestRate: 6,
  minPayment: 200,
  ...over,
})

describe('buildPayoffPlan', () => {
  it('clears a single debt in a sensible number of months', () => {
    const plan = buildPayoffPlan([card()], 0, 'avalanche')

    expect(plan.feasible).toBe(true)
    expect(plan.months).toBeGreaterThan(30)
    expect(plan.months).toBeLessThan(60)
    expect(plan.totalInterest).toBeGreaterThan(0)
    expect(plan.totalPaid).toBeCloseTo(3000 + plan.totalInterest, 0)
  })

  it('returns an empty plan for no debts', () => {
    const plan = buildPayoffPlan([], 100, 'snowball')
    expect(plan.months).toBe(0)
    expect(plan.feasible).toBe(true)
  })

  it('rolls a cleared debt’s payment into the next one', () => {
    // The defining behaviour of both strategies. Amortising each debt in
    // isolation — what the old calculator did — makes the portfolio take
    // longer than this.
    const rolled = buildPayoffPlan([card(), loan()], 0, 'snowball')
    const isolatedMonths = Math.max(
      buildPayoffPlan([card()], 0, 'snowball').months,
      buildPayoffPlan([loan()], 0, 'snowball').months
    )

    expect(rolled.months).toBeLessThanOrEqual(isolatedMonths)
    expect(rolled.perDebt.every((d) => d.clearedInMonth > 0)).toBe(true)
  })

  it('targets the highest rate under avalanche and the smallest balance under snowball', () => {
    const small = card({ id: 'small', balance: 500, interestRate: 5, minPayment: 25 })
    const big = card({ id: 'big', balance: 9000, interestRate: 25, minPayment: 250 })

    expect(buildPayoffPlan([small, big], 300, 'avalanche').order[0]).toBe('big')
    expect(buildPayoffPlan([small, big], 300, 'snowball').order[0]).toBe('small')
  })

  it('avalanche never costs more interest than snowball', () => {
    const debts = [card(), loan(), card({ id: 'store', balance: 1200, interestRate: 29, minPayment: 40 })]

    const { avalanche, snowball } = compareStrategies(debts, 250)
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest + 0.01)
  })

  it('flags a debt whose minimum does not cover its interest instead of reporting 600 months', () => {
    // £10,000 at 30% accrues £250 a month; a £50 minimum never touches the
    // principal. The old calculator ran to its 600-month guard and printed a
    // large-but-finite payoff for a debt that is never paid off.
    const trap = card({ balance: 10000, interestRate: 30, minPayment: 50 })

    const plan = buildPayoffPlan([trap], 0, 'avalanche')

    expect(plan.feasible).toBe(false)
    expect(plan.months).toBe(Infinity)
    expect(plan.payoffDate).toBeNull()
    expect(plan.neverPaidOff[0].name).toBe('Credit card')
    expect(plan.neverPaidOff[0].shortfall).toBeGreaterThan(0)
  })

  it('becomes feasible again once the extra payment covers the interest', () => {
    const trap = card({ balance: 10000, interestRate: 30, minPayment: 50 })

    expect(buildPayoffPlan([trap], 400, 'avalanche').feasible).toBe(true)
  })

  it('assumes a minimum payment when none is recorded rather than dividing by nothing', () => {
    const plan = buildPayoffPlan([card({ minPayment: null })], 0, 'avalanche')

    expect(plan.feasible).toBe(true)
    expect(Number.isFinite(plan.months)).toBe(true)
  })

  it('handles a zero-interest debt', () => {
    const plan = buildPayoffPlan([card({ interestRate: 0, balance: 1200, minPayment: 100 })], 0, 'snowball')

    expect(plan.months).toBe(12)
    expect(plan.totalInterest).toBeCloseTo(0, 2)
  })
})

describe('comparePlans', () => {
  it('quantifies what the extra payment buys', () => {
    const debts = [card(), loan()]
    const { monthsSaved, interestSaved } = comparePlans(debts, 300, 'avalanche')

    expect(monthsSaved).toBeGreaterThan(0)
    expect(interestSaved).toBeGreaterThan(0)
  })

  it('reports nulls rather than nonsense when the debt cannot be cleared', () => {
    const trap = card({ balance: 10000, interestRate: 30, minPayment: 50 })
    const { monthsSaved, interestSaved } = comparePlans([trap], 0, 'avalanche')

    expect(monthsSaved).toBeNull()
    expect(interestSaved).toBeNull()
  })
})
