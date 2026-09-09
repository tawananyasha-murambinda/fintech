import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { runDailyJobs } from '@/lib/cron-jobs'
import { logger } from '@/lib/logger'

// This route is publicly routable, so it must authenticate the caller itself.
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; any other scheduler
// can do the same.
export const dynamic = 'force-dynamic'
// The sweep is proportional to user count. 300s needs a Vercel plan that
// allows it (Hobby caps at 60s) — drop this to 60 on Hobby, and once the job
// no longer fits in one invocation, move it to a queue rather than raising it.
export const maxDuration = 300

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = req.headers.get('authorization') || ''
  const presented = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '')
  const expected = Buffer.from(secret)

  // timingSafeEqual throws on length mismatch, so compare byte lengths first.
  // The length of a secret is not itself sensitive.
  if (presented.length !== expected.length) return false

  return timingSafeEqual(presented, expected)
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    logger.error('Daily cron invoked but CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Cron is not configured.' }, { status: 503 })
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = await runDailyJobs()
  return NextResponse.json(report)
}

// Same handler under POST so schedulers that only issue POSTs work unchanged.
export const POST = GET
