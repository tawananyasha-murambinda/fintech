import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// In-memory sliding-window limiter keyed by IP or user id.
// Suitable for single-instance deployments; for multi-region serverless
// functions, back this with an external store (Redis/Upstash).
const buckets = new Map<string, Bucket>()

export function rateLimit(
  req: NextRequest,
  opts: { limit: number; windowMs: number; key: string; scope?: 'ip' | 'user' }
): NextResponse | null {
  const now = Date.now()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const bucketKey = opts.scope === 'user' ? `${opts.key}:${opts.key}` : `${opts.key}:${ip}`

  const bucket = buckets.get(bucketKey)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs })
    return null
  }

  bucket.count += 1
  if (bucket.count > opts.limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests, please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }

  return null
}
