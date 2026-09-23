import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { signIn, signOut } from '@/test/harness'

// The seed endpoint rewrites an account's entire transaction history, so the
// guard around it matters more than what it writes. These assert the guard.

vi.mock('../../../../scripts/seed-demo-bank.mjs', () => ({
  seedInto: vi.fn(async () => ({
    transactions: 932,
    budgets: 6,
    goals: 3,
    bills: 6,
    liabilities: 1,
    netWorthPoints: 13,
    openingBalance: 3669.02,
    closingBalance: 3197.37,
    lowestBalance: 150,
    from: '2025-09-24',
    to: '2026-09-23',
  })),
}))

const route = await import('@/app/api/dev/seed/route')
const seeder = await import('../../../../scripts/seed-demo-bank.mjs')

const DEV = 'dev@example.com'
const post = () => route.POST()

describe('POST /api/dev/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEVELOPER_EMAILS = DEV
    signIn({ id: 'u1', email: DEV })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: DEV })
  })

  afterEach(() => {
    delete process.env.DEVELOPER_EMAILS
  })

  it('refuses a signed-out request', async () => {
    signOut()
    expect((await post()).status).toBe(401)
    expect(seeder.seedInto).not.toHaveBeenCalled()
  })

  it('hides itself from a signed-in user who is not a developer', async () => {
    signIn({ id: 'u2', email: 'someone@example.com' })

    // 404 rather than 403: an ordinary account should not learn the route is
    // there at all.
    expect((await post()).status).toBe(404)
    expect(seeder.seedInto).not.toHaveBeenCalled()
  })

  it('is inert when no developer allow-list is configured', async () => {
    delete process.env.DEVELOPER_EMAILS

    expect((await post()).status).toBe(404)
    expect(seeder.seedInto).not.toHaveBeenCalled()
  })

  it('seeds the caller, and takes no target from the request', async () => {
    const res = await post()
    expect(res.status).toBe(200)

    // The user object comes from the session lookup, never from input — the
    // route cannot be pointed at another account.
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } })
    expect(seeder.seedInto).toHaveBeenCalledWith(expect.anything(), { id: 'u1', email: DEV })

    const body = await res.json()
    expect(body.seeded).toBe(true)
    expect(body.transactions).toBe(932)
  })

  it('reports why it failed rather than a bare 500', async () => {
    vi.mocked(seeder.seedInto).mockRejectedValueOnce(
      new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
    )

    const res = await post()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/ENCRYPTION_KEY/)
  })
})
