import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from './logger'

type Bucket = { count: number; resetAt: number }

// Fixed-window rate limiter.
//
// Backed by Upstash Redis over its REST API when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set. This matters on serverless: each lambda
// instance gets its own process memory, so a purely in-process limiter caps
// an attacker at (limit x instance count) rather than at `limit`. Redis gives
// every instance one shared counter.
//
// Without those env vars it falls back to an in-memory map, which is correct
// for local development and single-instance deploys. The fallback is also
// used when Redis is unreachable, so a Redis outage degrades protection
// instead of locking every user out of the app.
const buckets = new Map<string, Bucket>()

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export function isDistributed(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN)
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// The bucket key decides who shares a quota. A 'user'-scoped limit must be
// keyed on the caller's identity (already baked into opts.key by the route,
// e.g. `chat:${userId}`); an 'ip'-scoped limit appends the client IP.
export function bucketKey(req: NextRequest, opts: { key: string; scope?: 'ip' | 'user' }): string {
  return opts.scope === 'user' ? `rl:${opts.key}` : `rl:${opts.key}:${clientIp(req)}`
}

function memoryHit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    // Opportunistic sweep so long-lived instances don't grow unbounded.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    }
    return { allowed: true, resetAt }
  }
  bucket.count += 1
  return { allowed: bucket.count <= limit, resetAt: bucket.resetAt }
}

// INCR the counter and set its TTL only when the key is new (EXPIRE ... NX),
// so the window starts at the first request and does not slide forward with
// every subsequent one.
async function redisHit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; resetAt: number } | null> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
        ['PTTL', key],
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`)

    const parsed = (await res.json()) as Array<{ result?: unknown; error?: string }>
    const count = Number(parsed[0]?.result)
    if (!Number.isFinite(count)) throw new Error('Unexpected Upstash INCR reply')

    const pttl = Number(parsed[2]?.result)
    const resetAt = Date.now() + (Number.isFinite(pttl) && pttl > 0 ? pttl : windowMs)
    return { allowed: count <= limit, resetAt }
  } catch (err) {
    // Fail open to the in-memory limiter rather than 500ing the route.
    logger.warn('Rate limiter falling back to in-memory store', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function rateLimit(
  req: NextRequest,
  opts: { limit: number; windowMs: number; key: string; scope?: 'ip' | 'user' }
): Promise<NextResponse | null> {
  const key = bucketKey(req, opts)

  let outcome: { allowed: boolean; resetAt: number } | null = null
  if (isDistributed()) outcome = await redisHit(key, opts.limit, opts.windowMs)
  if (!outcome) outcome = memoryHit(key, opts.limit, opts.windowMs)

  if (outcome.allowed) return null

  const retryAfterSec = Math.max(1, Math.ceil((outcome.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests, please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(opts.limit),
        'X-RateLimit-Reset': String(Math.ceil(outcome.resetAt / 1000)),
      },
    }
  )
}

// Test seam: clears the in-memory fallback between cases.
export function __resetRateLimitMemory() {
  buckets.clear()
}
