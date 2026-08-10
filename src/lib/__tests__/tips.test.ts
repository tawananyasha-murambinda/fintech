import { describe, it, expect } from 'vitest'
import { generateAiTip } from '../ai'
import type { Transaction } from '@/types'

const tx = (description: string, amount: number, merchantCategory: string, direction: 'debit' | 'credit' = 'debit'): Transaction => ({
  id: '1',
  date: '2026-01-15',
  amount,
  direction,
  description,
  merchantName: description,
  merchantCategory,
  status: 'posted',
})

describe('generateAiTip local fallback', () => {
  it('returns a friendly message when there is no spending data', async () => {
    const result = await generateAiTip([], 'GBP', { allowAi: false })
    expect(result.source).toBe('local')
    expect(result.tip).toMatch(/no spending/i)
  })

  it('builds a data-driven tip when allowAi is disabled', async () => {
    const transactions = [
      tx('Acme Rent', 1350, 'rent'),
      tx('Tesco', 60, 'groceries'),
      tx('Tesco', 45, 'groceries'),
      tx('Tesco', 38, 'groceries'),
      tx('Acme Rent', 2500, 'paycheck', 'credit'),
    ]
    const result = await generateAiTip(transactions, 'GBP', { allowAi: false })
    expect(result.source).toBe('local')
    expect(result.tip).toMatch(/Rent|Tesco/)
    expect(result.tip).toMatch(/£/)
  })

  it('keeps the tip on-message when the data supports several angles', async () => {
    const transactions = [
      tx('Acme Rent', 1350, 'rent'),
      tx('Salary', 2500, 'paycheck', 'credit'),
    ]
    const result = await generateAiTip(transactions, 'GBP', { allowAi: false })
    expect(result.source).toBe('local')
    expect(result.tip).toMatch(/Rent|£/)
  })
})
