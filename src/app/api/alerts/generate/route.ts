import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAlertsForUser } from '@/lib/alerts'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const created = await generateAlertsForUser(session.user.id)
    return NextResponse.json({ generated: created.length, alerts: created })
  } catch (err) {
    logger.error('Alert generation failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not refresh your alerts right now.')
    return NextResponse.json({ error }, { status })
  }
}
