import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit } from '../rate-limit'

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const req = new NextRequest('http://localhost/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const opts = { limit: 2, windowMs: 60000, key: 'test-in-limit' }

    expect(rateLimit(req, opts)).toBeNull()
    expect(rateLimit(req, opts)).toBeNull()
  })

  it('returns a 429 response once the limit is exceeded', () => {
    const req = new NextRequest('http://localhost/test', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    })
    const opts = { limit: 2, windowMs: 60000, key: 'test-over-limit' }

    expect(rateLimit(req, opts)).toBeNull()
    expect(rateLimit(req, opts)).toBeNull()
    const blocked = rateLimit(req, opts)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).toBeDefined()
  })

  it('isolates buckets by IP', () => {
    const opts = { limit: 1, windowMs: 60000, key: 'test-ip-isolation' }
    const a = new NextRequest('http://localhost/test', { headers: { 'x-forwarded-for': '10.0.0.1' } })
    const b = new NextRequest('http://localhost/test', { headers: { 'x-forwarded-for': '10.0.0.2' } })

    expect(rateLimit(a, opts)).toBeNull()
    expect(rateLimit(a, opts)).not.toBeNull()
    expect(rateLimit(b, opts)).toBeNull()
  })
})
