import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportUserData } from '@/lib/export'
import { logAudit, requestMeta } from '@/lib/audit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET /api/account/export — GDPR-style download of all the user's data.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await exportUserData(session.user.id)
    const json = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)

    await logAudit(session.user.id, 'account.export', {
      ...requestMeta(req),
      metadata: { recordCount: json.length },
    })

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fintrack-export-${date}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    logger.error('Account export failed', { userId: session.user.id })
    const { error, status } = errorResponse(err, 'We could not prepare your export right now.')
    return NextResponse.json({ error }, { status })
  }
}
