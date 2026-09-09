import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { jsonRequest } from '@/test/harness'

const runDailyJobs = vi.fn(async () => ({ ok: true }))
vi.mock('@/lib/cron-jobs', () => ({ runDailyJobs }))

const { GET, POST } = await import('@/app/api/cron/daily/route')

const SECRET = 'c'.repeat(64)
const authed = (token: string) =>
  jsonRequest('/api/cron/daily', undefined, { headers: { authorization: `Bearer ${token}` } })

describe('GET /api/cron/daily', () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
  })
  afterEach(() => {
    process.env = { ...env }
  })

  it('runs the jobs for a caller with the right token', async () => {
    const res = await GET(authed(SECRET))

    expect(res.status).toBe(200)
    expect(runDailyJobs).toHaveBeenCalledOnce()
  })

  it('refuses an unauthenticated caller — the route is publicly routable', async () => {
    const res = await GET(jsonRequest('/api/cron/daily'))

    expect(res.status).toBe(401)
    expect(runDailyJobs).not.toHaveBeenCalled()
  })

  it('refuses a wrong token of the same length', async () => {
    const res = await GET(authed('d'.repeat(64)))

    expect(res.status).toBe(401)
    expect(runDailyJobs).not.toHaveBeenCalled()
  })

  it('refuses a token of a different length without throwing', async () => {
    // timingSafeEqual throws on mismatched buffer lengths; the length guard
    // must catch that rather than surfacing a 500.
    const res = await GET(authed('short'))

    expect(res.status).toBe(401)
  })

  it('refuses a bare token that is not a Bearer credential', async () => {
    const res = await GET(
      jsonRequest('/api/cron/daily', undefined, { headers: { authorization: SECRET } })
    )

    expect(res.status).toBe(401)
  })

  it('returns 503 and runs nothing when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(authed(SECRET))

    expect(res.status).toBe(503)
    expect(runDailyJobs).not.toHaveBeenCalled()
  })

  it('accepts POST for schedulers that only issue POSTs', async () => {
    const res = await POST(authed(SECRET))

    expect(res.status).toBe(200)
  })
})
