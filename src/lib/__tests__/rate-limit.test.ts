import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit, bucketKey, __resetRateLimitMemory } from '../rate-limit'

function req(ip: string) {
  return new NextRequest('http://localhost/test', { headers: { 'x-forwarded-for': ip } })
}

describe('rateLimit', () => {
  beforeEach(() => __resetRateLimitMemory())

  it('allows requests within the limit', async () => {
    const r = req('1.2.3.4')
    const opts = { limit: 2, windowMs: 60000, key: 'test-in-limit' }

    expect(await rateLimit(r, opts)).toBeNull()
    expect(await rateLimit(r, opts)).toBeNull()
  })

  it('returns a 429 response once the limit is exceeded', async () => {
    const r = req('5.6.7.8')
    const opts = { limit: 2, windowMs: 60000, key: 'test-over-limit' }

    expect(await rateLimit(r, opts)).toBeNull()
    expect(await rateLimit(r, opts)).toBeNull()
    const blocked = await rateLimit(r, opts)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).toBeDefined()
    expect(blocked!.headers.get('X-RateLimit-Limit')).toBe('2')
  })

  it('isolates buckets by IP', async () => {
    const opts = { limit: 1, windowMs: 60000, key: 'test-ip-isolation' }

    expect(await rateLimit(req('10.0.0.1'), opts)).toBeNull()
    expect(await rateLimit(req('10.0.0.1'), opts)).not.toBeNull()
    expect(await rateLimit(req('10.0.0.2'), opts)).toBeNull()
  })

  it('releases the bucket once the window has elapsed', async () => {
    const r = req('9.9.9.9')
    const opts = { limit: 1, windowMs: 1, key: 'test-window-expiry' }

    expect(await rateLimit(r, opts)).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(await rateLimit(r, opts)).toBeNull()
  })
})

describe('bucketKey', () => {
  // Regression: the user scope previously built `${key}:${key}`, which ignored
  // the caller entirely and put every user in the world into one shared bucket
  // — so one heavy user could rate-limit everybody else off the endpoint.
  it('keys user-scoped limits on the caller identity, not the IP', () => {
    const alice = bucketKey(req('1.1.1.1'), { key: 'chat:alice', scope: 'user' })
    const bob = bucketKey(req('1.1.1.1'), { key: 'chat:bob', scope: 'user' })

    expect(alice).not.toBe(bob)
    expect(alice).toContain('alice')
  })

  it('gives one user the same bucket across IPs', () => {
    const home = bucketKey(req('1.1.1.1'), { key: 'chat:alice', scope: 'user' })
    const phone = bucketKey(req('2.2.2.2'), { key: 'chat:alice', scope: 'user' })

    expect(home).toBe(phone)
  })

  it('separates ip-scoped limits by IP', () => {
    const a = bucketKey(req('1.1.1.1'), { key: 'register' })
    const b = bucketKey(req('2.2.2.2'), { key: 'register' })

    expect(a).not.toBe(b)
  })
})

describe('user-scoped limiting end to end', () => {
  beforeEach(() => __resetRateLimitMemory())

  it('does not let one user exhaust another user’s quota', async () => {
    const opts = { limit: 1, windowMs: 60000, scope: 'user' as const }
    const shared = req('1.1.1.1')

    expect(await rateLimit(shared, { ...opts, key: 'chat:alice' })).toBeNull()
    expect(await rateLimit(shared, { ...opts, key: 'chat:alice' })).not.toBeNull()
    // Bob shares Alice's IP (office NAT, mobile carrier) but not her quota.
    expect(await rateLimit(shared, { ...opts, key: 'chat:bob' })).toBeNull()
  })
})
