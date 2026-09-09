import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { runTool, TOOL_DEFINITIONS, type ToolContext } from '@/lib/assistant/tools'

const ctx: ToolContext = { userId: 'u1', currency: 'GBP', now: new Date('2026-06-15T12:00:00Z') }

const tx = (amount: number, category: string, merchantName: string, daysAgo = 1, direction = 'debit') => ({
  id: `t${Math.random()}`,
  date: new Date(ctx.now.getTime() - daysAgo * 86_400_000),
  amount: -amount,
  direction,
  merchantName,
  description: merchantName,
  merchantCategory: category,
})

describe('tool definitions', () => {
  it('covers every part of the app the user can ask about', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name)
    // The old chat had only three transaction tools, which is why it could
    // never answer a budget, debt or subscription question.
    for (const expected of [
      'budget_status',
      'goal_progress',
      'upcoming_bills',
      'debt_payoff',
      'net_worth',
      'subscriptions',
      'unusual_activity',
      'cashflow_summary',
    ]) {
      expect(names).toContain(expected)
    }
  })

  it('gives every tool a description the model can route on', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description.length).toBeGreaterThan(40)
      expect(tool.input_schema.type).toBe('object')
    }
  })
})

describe('cashflow_summary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('computes a savings rate from real rows', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      { amount: -3000, direction: 'credit' },
      { amount: -1200, direction: 'debit' },
    ])

    const result: any = await runTool('cashflow_summary', {}, ctx)

    expect(result.income).toBe(3000)
    expect(result.expenses).toBe(1200)
    expect(result.net).toBe(1800)
    expect(result.savings_rate_percent).toBe(60)
  })

  it('reports null rather than dividing by zero income', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([{ amount: -50, direction: 'debit' }])

    const result: any = await runTool('cashflow_summary', {}, ctx)
    expect(result.savings_rate_percent).toBeNull()
  })
})

describe('spending_by_category', () => {
  beforeEach(() => vi.clearAllMocks())

  it('groups differently-spelled categories together', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      { amount: -20, merchantCategory: 'FOOD_AND_DRINK' },
      { amount: -30, merchantCategory: 'Food & Dining' },
    ])

    const result: any = await runTool('spending_by_category', {}, ctx)

    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]).toMatchObject({ category: 'Food & Dining', total: 50 })
  })

  it('compares against the preceding window when asked', async () => {
    mockPrisma.transaction.findMany
      .mockResolvedValueOnce([{ amount: -150, merchantCategory: 'FOOD_AND_DRINK' }])
      .mockResolvedValueOnce([{ amount: -100, merchantCategory: 'FOOD_AND_DRINK' }])

    const result: any = await runTool('spending_by_category', { compare_to_previous: true }, ctx)

    expect(result.categories[0]).toMatchObject({ change: 50, change_percent: 50 })
  })

  it('returns a null percent change when there is no baseline to compare to', async () => {
    mockPrisma.transaction.findMany
      .mockResolvedValueOnce([{ amount: -80, merchantCategory: 'TRAVEL' }])
      .mockResolvedValueOnce([])

    const result: any = await runTool('spending_by_category', { compare_to_previous: true }, ctx)
    expect(result.categories[0].change_percent).toBeNull()
  })
})

describe('debt_payoff', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports infeasibility instead of a payoff date', async () => {
    // The assistant must never quote "600 months" for a debt that never clears.
    mockPrisma.liability.findMany.mockResolvedValue([
      { id: 'l1', name: 'Card', balance: 10000, interestRate: 30, minPayment: 50 },
    ])

    const result: any = await runTool('debt_payoff', {}, ctx)

    expect(result.feasible).toBe(false)
    expect(result).not.toHaveProperty('months_to_debt_free')
    expect(result.shortfalls[0].name).toBe('Card')
  })

  it('returns a clearing order when the debt can be paid off', async () => {
    mockPrisma.liability.findMany.mockResolvedValue([
      { id: 'l1', name: 'Card', balance: 3000, interestRate: 22, minPayment: 90 },
      { id: 'l2', name: 'Loan', balance: 8000, interestRate: 6, minPayment: 200 },
    ])

    const result: any = await runTool('debt_payoff', { extra_payment: 200 }, ctx)

    expect(result.feasible).toBe(true)
    expect(result.clearing_order).toHaveLength(2)
    expect(result.months_to_debt_free).toBeGreaterThan(0)
  })

  it('says so plainly when there are no liabilities', async () => {
    mockPrisma.liability.findMany.mockResolvedValue([])
    const result: any = await runTool('debt_payoff', {}, ctx)
    expect(result.count).toBe(0)
  })
})

describe('goal_progress', () => {
  beforeEach(() => vi.clearAllMocks())

  it('works out what must be saved each month to hit the deadline', async () => {
    mockPrisma.goal.findMany.mockResolvedValue([
      {
        name: 'House deposit',
        targetAmount: 20000,
        currentAmount: 5000,
        deadline: new Date(ctx.now.getTime() + 300 * 86_400_000),
      },
    ])

    const result: any = await runTool('goal_progress', {}, ctx)

    expect(result.goals[0].remaining).toBe(15000)
    expect(result.goals[0].percent_complete).toBe(25)
    expect(result.goals[0].required_monthly).toBeGreaterThan(0)
  })

  it('omits a monthly target when there is no deadline', async () => {
    mockPrisma.goal.findMany.mockResolvedValue([
      { name: 'Rainy day', targetAmount: 1000, currentAmount: 250, deadline: null },
    ])

    const result: any = await runTool('goal_progress', {}, ctx)
    expect(result.goals[0].required_monthly).toBeNull()
  })
})

describe('top_merchants', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates visits and averages per merchant', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      tx(10, 'FOOD_AND_DRINK', 'Tesco'),
      tx(20, 'FOOD_AND_DRINK', 'Tesco'),
      tx(45, 'GENERAL_MERCHANDISE', 'Amazon'),
    ])

    const result: any = await runTool('top_merchants', {}, ctx)

    expect(result.merchants[0]).toMatchObject({ merchant: 'Amazon', total: 45, visits: 1 })
    expect(result.merchants[1]).toMatchObject({ merchant: 'Tesco', total: 30, visits: 2, average: 15 })
  })
})

describe('unknown tool', () => {
  it('reports the name rather than throwing into the loop', async () => {
    const result: any = await runTool('not_a_tool', {}, ctx)
    expect(result.error).toContain('not_a_tool')
  })
})
