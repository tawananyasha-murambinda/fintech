import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mockPrisma } from '@/test/setup'
import { jsonRequest } from '@/test/harness'

// Stripe's SDK is replaced so the tests drive event payloads directly rather
// than forging real HMAC signatures.
const constructEventAsync = vi.fn()
const subscriptionsRetrieve = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEventAsync },
    subscriptions: { retrieve: subscriptionsRetrieve },
  }),
}))

const { POST } = await import('@/app/api/billing/webhook/route')

function webhookRequest(body: unknown = { any: 'payload' }) {
  return jsonRequest('/api/billing/webhook', body, {
    headers: { 'stripe-signature': 't=1,v1=deadbeef' },
  })
}

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_123',
    customer: 'cus_123',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: 1_800_000_000,
    metadata: { userId: 'user_alice' },
    items: { data: [{ price: { id: 'price_plus_123' } }] },
    ...overrides,
  }
}

describe('POST /api/billing/webhook', () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_PRICE_PLUS = 'price_plus_123'
    process.env.STRIPE_PRICE_PRO = 'price_pro_456'
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_alice' })
    mockPrisma.billingEvent.create.mockResolvedValue({ id: 'evt_1' })
    mockPrisma.billingEvent.update.mockResolvedValue({ id: 'evt_1' })
    mockPrisma.user.update.mockResolvedValue({ id: 'user_alice' })
  })

  afterEach(() => {
    process.env = { ...env }
  })

  it('rejects a request with no signature header without parsing it', async () => {
    const res = await POST(jsonRequest('/api/billing/webhook', {}))

    expect(res.status).toBe(400)
    expect(constructEventAsync).not.toHaveBeenCalled()
  })

  it('rejects a forged signature and never touches the database', async () => {
    constructEventAsync.mockRejectedValue(new Error('No signatures found matching'))

    const res = await POST(webhookRequest())

    expect(res.status).toBe(400)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockPrisma.billingEvent.create).not.toHaveBeenCalled()
  })

  it('returns 503 rather than trusting anything when no secret is configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const res = await POST(webhookRequest())

    expect(res.status).toBe(503)
    expect(constructEventAsync).not.toHaveBeenCalled()
  })

  it('upgrades the user on an active subscription', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: subscription() },
    })

    const res = await POST(webhookRequest())

    expect(res.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_alice' },
        data: expect.objectContaining({ plan: 'plus', subscriptionStatus: 'active' }),
      })
    )
  })

  it('downgrades to free when the subscription is cancelled', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_2',
      type: 'customer.subscription.deleted',
      data: { object: subscription({ status: 'canceled' }) },
    })

    await POST(webhookRequest())

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: 'free' }) })
    )
  })

  it('keeps access while a payment is being retried (past_due)', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_3',
      type: 'customer.subscription.updated',
      data: { object: subscription({ status: 'past_due' }) },
    })

    await POST(webhookRequest())

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: 'plus' }) })
    )
  })

  it('leaves the plan untouched when the price id is not recognised', async () => {
    // Config drift between Stripe and the deploy must not silently downgrade
    // — or upgrade — a paying customer.
    constructEventAsync.mockResolvedValue({
      id: 'evt_4',
      type: 'customer.subscription.updated',
      data: { object: subscription({ items: { data: [{ price: { id: 'price_mystery' } }] } }) },
    })

    await POST(webhookRequest())

    const call = mockPrisma.user.update.mock.calls[0][0]
    expect(call.data).not.toHaveProperty('plan')
    expect(call.data.subscriptionStatus).toBe('active')
  })

  it('treats a duplicate event id as an already-processed replay', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_5',
      type: 'customer.subscription.updated',
      data: { object: subscription() },
    })
    mockPrisma.billingEvent.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    )

    const res = await POST(webhookRequest())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ duplicate: true })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('asks Stripe to retry when the database is down, rather than dropping the event', async () => {
    // Regression: any create() failure used to be read as a replay, which
    // silently discarded real plan changes during a database blip.
    constructEventAsync.mockResolvedValue({
      id: 'evt_6',
      type: 'customer.subscription.updated',
      data: { object: subscription() },
    })
    mockPrisma.billingEvent.create.mockRejectedValue(
      Object.assign(new Error("Can't reach database server"), { code: 'P1001' })
    )

    const res = await POST(webhookRequest())

    expect(res.status).toBe(500)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('resolves the user by customer id when metadata is missing', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_7',
      type: 'customer.subscription.updated',
      data: { object: subscription({ metadata: {} }) },
    })
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) =>
      where.stripeCustomerId === 'cus_123' ? { id: 'user_alice' } : null
    )

    await POST(webhookRequest())

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_alice' } })
    )
  })

  it('acknowledges event types it does not handle without recording them', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_8',
      type: 'customer.created',
      data: { object: {} },
    })

    const res = await POST(webhookRequest())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ handled: false })
    expect(mockPrisma.billingEvent.create).not.toHaveBeenCalled()
  })

  it('follows checkout.session.completed through to the subscription', async () => {
    constructEventAsync.mockResolvedValue({
      id: 'evt_9',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123', client_reference_id: 'user_alice' } },
    })
    subscriptionsRetrieve.mockResolvedValue(subscription({ metadata: {} }))

    await POST(webhookRequest())

    expect(subscriptionsRetrieve).toHaveBeenCalledWith('sub_123')
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: 'plus' }) })
    )
  })
})
