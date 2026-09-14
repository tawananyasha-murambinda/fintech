import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { signIn, signOut, jsonRequest } from '@/test/harness'

const { POST, DELETE } = await import('@/app/api/transactions/splits/route')

describe('POST /api/transactions/splits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn({ id: 'user_alice' })
    mockPrisma.transaction.findFirst.mockResolvedValue({ amount: -80 })
    mockPrisma.transactionSplit.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.transactionSplit.createMany.mockResolvedValue({ count: 2 })
  })

  const body = (splits: any[]) => ({ transactionId: 't1', splits })

  it('requires a session', async () => {
    signOut()
    const res = await POST(jsonRequest('/api/transactions/splits', body([{ amount: 10, category: 'Groceries' }])))
    expect(res.status).toBe(401)
  })

  it('saves splits that fit inside the transaction', async () => {
    const res = await POST(
      jsonRequest('/api/transactions/splits', body([
        { amount: 50, category: 'Groceries' },
        { amount: 30, category: 'Shopping' },
      ]))
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total).toBe(80)
    expect(json.remainder).toBe(0)
  })

  it('refuses splits that exceed the transaction', async () => {
    // Otherwise category totals — and any deduction claimed from them —
    // would exceed what was actually spent.
    const res = await POST(
      jsonRequest('/api/transactions/splits', body([
        { amount: 50, category: 'Groceries' },
        { amount: 60, category: 'Shopping' },
      ]))
    )

    expect(res.status).toBe(400)
    expect(mockPrisma.transactionSplit.createMany).not.toHaveBeenCalled()
  })

  it('allows a partial split and reports the remainder', async () => {
    const res = await POST(jsonRequest('/api/transactions/splits', body([{ amount: 30, category: 'Shopping' }])))

    expect(res.status).toBe(200)
    expect((await res.json()).remainder).toBe(50)
  })

  it('404s on a transaction that is not yours', async () => {
    // Ownership is checked server-side, not trusted from the body.
    mockPrisma.transaction.findFirst.mockResolvedValue(null)

    const res = await POST(jsonRequest('/api/transactions/splits', body([{ amount: 10, category: 'Shopping' }])))

    expect(res.status).toBe(404)
    expect(mockPrisma.transactionSplit.createMany).not.toHaveBeenCalled()
  })

  it('replaces an existing split set rather than appending to it', async () => {
    await POST(jsonRequest('/api/transactions/splits', body([{ amount: 10, category: 'Shopping' }])))
    expect(mockPrisma.transactionSplit.deleteMany).toHaveBeenCalled()
  })

  it('rejects a negative or zero split', async () => {
    const res = await POST(jsonRequest('/api/transactions/splits', body([{ amount: -5, category: 'Shopping' }])))
    expect(res.status).toBe(400)
  })

  it('requires a transaction to split', async () => {
    const res = await POST(
      jsonRequest('/api/transactions/splits', { splits: [{ amount: 5, category: 'Shopping' }] })
    )
    expect(res.status).toBe(400)
  })

  it('normalises the category so splits match budgets', async () => {
    await POST(jsonRequest('/api/transactions/splits', body([{ amount: 10, category: 'FOOD_AND_DRINK' }])))

    const created = mockPrisma.transactionSplit.createMany.mock.calls[0][0].data
    expect(created[0].category).toBe('Food & Dining')
  })
})

describe('DELETE /api/transactions/splits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn({ id: 'user_alice' })
    mockPrisma.transactionSplit.deleteMany.mockResolvedValue({ count: 2 })
  })

  it('clears the splits for a transaction, scoped to the owner', async () => {
    const res = await DELETE(
      jsonRequest('/api/transactions/splits?transactionId=t1', undefined, { method: 'DELETE' })
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.transactionSplit.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user_alice' }) })
    )
  })
})
