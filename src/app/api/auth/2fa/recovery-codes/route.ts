import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { verifySecondFactor, issueRecoveryCodes, countUnusedRecoveryCodes } from '@/lib/two-factor'
import { logAudit, requestMeta } from '@/lib/audit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

const schema = z.object({ code: z.string().min(6).max(20) })

// GET — how many codes are left, so the UI can nudge before they run out.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [remaining, user] = await Promise.all([
    countUnusedRecoveryCodes(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, twoFactorVerifiedAt: true },
    }),
  ])

  return NextResponse.json({
    enabled: user?.twoFactorEnabled ?? false,
    enabledAt: user?.twoFactorVerifiedAt ?? null,
    remainingRecoveryCodes: remaining,
  })
}

// POST — regenerates the set. Requires a current code, because whoever holds
// the codes holds the account.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    key: `2fa-recovery:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a current authentication code.' }, { status: 400 })
    }

    const second = await verifySecondFactor(session.user.id, parsed.data.code)
    if (!second.ok) {
      return NextResponse.json({ error: 'That authentication code is not right.' }, { status: 400 })
    }

    const recoveryCodes = await issueRecoveryCodes(session.user.id)
    await logAudit(session.user.id, 'auth.2fa_recovery_codes_regenerated', requestMeta(req))

    return NextResponse.json({ recoveryCodes })
  } catch (err) {
    logger.error('Recovery code regeneration failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not regenerate your recovery codes.')
    return NextResponse.json({ error }, { status })
  }
}
