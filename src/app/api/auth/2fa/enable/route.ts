import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTotp } from '@/lib/totp'
import { decryptSecret, issueRecoveryCodes } from '@/lib/two-factor'
import { logAudit, requestMeta } from '@/lib/audit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

const schema = z.object({ code: z.string().min(6).max(10) })

// POST /api/auth/2fa/enable — confirms enrolment with a live code.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    key: `2fa-enable:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter the 6-digit code from your app.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: 'Start two-factor setup first.' }, { status: 409 })
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: 'Two-factor authentication is already on.' }, { status: 409 })
    }

    if (!verifyTotp(decryptSecret(user.twoFactorSecret), parsed.data.code)) {
      return NextResponse.json(
        { error: 'That code is not right. Check your phone’s clock and try the current code.' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: true, twoFactorVerifiedAt: new Date() },
    })

    // Shown exactly once. Losing the phone without these means losing the
    // account, so enrolment is not complete until the user has them.
    const recoveryCodes = await issueRecoveryCodes(session.user.id)

    await logAudit(session.user.id, 'auth.2fa_enabled', requestMeta(req))

    return NextResponse.json({ enabled: true, recoveryCodes })
  } catch (err) {
    logger.error('2FA enable failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not turn on two-factor authentication.')
    return NextResponse.json({ error }, { status })
  }
}
