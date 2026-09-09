import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { signIn, signOut, jsonRequest } from '@/test/harness'

const exchangePublicToken = vi.fn()
const getAccounts = vi.fn()
const getInstitution = vi.fn()

vi.mock('@/lib/plaid', () => ({ exchangePublicToken, getAccounts, getInstitution }))
vi.mock('@/lib/encryption', () => ({ encrypt: (v: string) => `enc(${v})` }))

const { POST } = await import('@/app/api/plaid/exchange/route')

const body = { publicToken: 'public-sandbox-123', institutionName: 'Test Bank' }

function plaidAccount(id: string) {
  return {
    account_id: id,
    type: 'depository',
    name: `Account ${id}`,
    balances: { iso_currency_code: 'USD' },
  }
}

describe('POST /api/plaid/exchange — plan limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn()
    exchangePublicToken.mockResolvedValue({ accessToken: 'access-1', itemId: 'item-1' })
    getAccounts.mockResolvedValue({ accounts: [plaidAccount('acc_1')] })
    mockPrisma.linkedBank.findUnique.mockResolvedValue(null)
    mockPrisma.linkedBank.create.mockImplementation(async ({ data }: any) => ({ id: 'bank_1', ...data }))
  })

  it('rejects an unauthenticated request', async () => {
    signOut()

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(res.status).toBe(401)
    expect(exchangePublicToken).not.toHaveBeenCalled()
  })

  it('rejects a malformed body before calling Plaid', async () => {
    const res = await POST(jsonRequest('/api/plaid/exchange', { publicToken: '' }))

    expect(res.status).toBe(400)
    expect(exchangePublicToken).not.toHaveBeenCalled()
  })

  it('links a bank when the user is under their plan limit', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'free' })
    mockPrisma.linkedBank.count.mockResolvedValue(0)

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ linked: 1 })
  })

  it('refuses at the limit with 402 and without spending a Plaid item', async () => {
    // The check must happen before the token exchange, or a refused link
    // still leaves a billable Plaid item stranded with nothing pointing at it.
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'free' })
    mockPrisma.linkedBank.count.mockResolvedValue(1)

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(res.status).toBe(402)
    expect(await res.json()).toMatchObject({ code: 'PLAN_LIMIT_REACHED', limit: 1 })
    expect(exchangePublicToken).not.toHaveBeenCalled()
  })

  it('lets a paid plan link more banks than the free tier allows', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'pro' })
    mockPrisma.linkedBank.count.mockResolvedValue(4)

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(res.status).toBe(200)
  })

  it('truncates a multi-account Link session at the plan limit', async () => {
    // One Plaid Link session can return several accounts; importing them all
    // would walk straight past the cap that was just checked.
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'free' })
    mockPrisma.linkedBank.count.mockResolvedValue(0)
    getAccounts.mockResolvedValue({
      accounts: [plaidAccount('acc_1'), plaidAccount('acc_2'), plaidAccount('acc_3')],
    })

    const res = await POST(jsonRequest('/api/plaid/exchange', body))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.linked).toBe(1)
    expect(json.skipped).toBe(2)
    expect(json.notice).toMatch(/limit/i)
    expect(mockPrisma.linkedBank.create).toHaveBeenCalledTimes(1)
  })

  it('treats an unknown plan value as free rather than unlimited', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'enterprise' })
    mockPrisma.linkedBank.count.mockResolvedValue(1)

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(res.status).toBe(402)
  })

  it('skips accounts already linked without counting them against the cap', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'free' })
    mockPrisma.linkedBank.count.mockResolvedValue(0)
    mockPrisma.linkedBank.findUnique.mockResolvedValue({ id: 'existing' })

    const res = await POST(jsonRequest('/api/plaid/exchange', body))

    expect(await res.json()).toMatchObject({ linked: 0, skipped: 0 })
  })
})
