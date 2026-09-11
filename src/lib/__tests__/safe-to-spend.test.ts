import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { computeSafeToSpend } from '../safe-to-spend'

const NOW = new Date('2026-06-15T00:00:00Z')

function salary(count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    merchantName: 'Acme Payroll',
    description: 'Acme Payroll',
    amount: 2400,
    direction: 'credit',
    date: new Date(NOW.getTime() - (count - 1 - i) * 30 * 86_400_000),
  }))
}

describe('computeSafeToSpend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.linkedBank.findMany.mockResolvedValue([
      { currentBalance: 1240, currency: 'GBP', accountName: 'Current' },
    ])
    mockPrisma.bill.findMany.mockResolvedValue([])
    mockPrisma.transaction.findMany.mockResolvedValue(salary())
  })

  it('subtracts bills that land before payday', async () => {
    mockPrisma.bill.findMany.mockResolvedValue([
      { id: 'b1', name: 'Rent', amount: 800, dueDate: 20, frequency: 'monthly', anchorDate: null, isActive: true },
    ])

    const result = await computeSafeToSpend('u1', NOW)

    expect(result.balance).toBe(1240)
    expect(result.committed).toBe(800)
    expect(result.safeToSpend).toBe(440)
  })

  it('ignores bills falling after the next payday', async () => {
    // A bill due the day after payday is paid from that money, not from this.
    mockPrisma.bill.findMany.mockResolvedValue([
      { id: 'b1', name: 'Far off', amount: 500, dueDate: 14, frequency: 'monthly', anchorDate: null, isActive: true },
    ])

    const result = await computeSafeToSpend('u1', NOW)
    expect(result.upcomingBills.every((b) => b.dueIn <= result.daysToCover)).toBe(true)
  })

  it('never reports a negative daily allowance', async () => {
    mockPrisma.bill.findMany.mockResolvedValue([
      { id: 'b1', name: 'Huge', amount: 5000, dueDate: 20, frequency: 'monthly', anchorDate: null, isActive: true },
    ])

    const result = await computeSafeToSpend('u1', NOW)

    expect(result.safeToSpend).toBeLessThan(0)
    expect(result.dailyAllowance).toBe(0)
    expect(result.caveats.join(' ')).toMatch(/more than your balance/)
  })

  it('excludes accounts with no reported balance and says so', async () => {
    mockPrisma.linkedBank.findMany.mockResolvedValue([
      { currentBalance: 1000, currency: 'GBP', accountName: 'Current' },
      { currentBalance: null, currency: 'GBP', accountName: 'Savings' },
    ])

    const result = await computeSafeToSpend('u1', NOW)

    expect(result.balance).toBe(1000)
    expect(result.accountsWithoutBalance).toBe(1)
    expect(result.caveats.join(' ')).toMatch(/not counted/)
  })

  it('falls back to the end of the month when there is no payday', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])

    const result = await computeSafeToSpend('u1', NOW)

    expect(result.nextPayday).toBeNull()
    expect(result.daysToCover).toBeGreaterThan(0)
    expect(result.caveats.join(' ')).toMatch(/end of the month/)
  })

  it('warns when accounts are in different currencies', async () => {
    mockPrisma.linkedBank.findMany.mockResolvedValue([
      { currentBalance: 500, currency: 'GBP', accountName: 'UK' },
      { currentBalance: 500, currency: 'EUR', accountName: 'EU' },
    ])

    const result = await computeSafeToSpend('u1', NOW)
    expect(result.caveats.join(' ')).toMatch(/different currencies/)
  })

  it('reports hasBalance false rather than a zero balance', async () => {
    mockPrisma.linkedBank.findMany.mockResolvedValue([
      { currentBalance: null, currency: 'GBP', accountName: 'Current' },
    ])

    const result = await computeSafeToSpend('u1', NOW)
    expect(result.hasBalance).toBe(false)
  })

  it('divides what is left across the days it has to cover', async () => {
    const result = await computeSafeToSpend('u1', NOW)
    expect(result.dailyAllowance).toBeCloseTo(result.safeToSpend / result.daysToCover, 1)
  })
})
