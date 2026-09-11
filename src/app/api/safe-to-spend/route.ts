import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeSafeToSpend } from '@/lib/safe-to-spend'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await computeSafeToSpend(session.user.id)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    logger.error('Safe to spend failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not work out your spending headroom.')
    return NextResponse.json({ error }, { status })
  }
}
