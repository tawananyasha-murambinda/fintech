import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { verifySecondFactor } from '@/lib/two-factor'
import { logAudit, requestMeta } from '@/lib/audit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(20),
})

// POST /api/auth/2fa/disable — turning the second factor off is itself a
// sensitive action, so it needs both the password and a current code. An
// attacker holding only a hijacked session cannot strip the protection.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    key: `2fa-disable:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Enter your password and a current authentication code.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorEnabled) {
      return NextResponse.json({ error: 'Two-factor authentication is not on.' }, { status: 409 })
    }
    if (!user.password) {
      return NextResponse.json(
        { error: 'This account signs in with Google, so it has no password to confirm.' },
        { status: 400 }
      )
    }

    if (!(await bcrypt.compare(parsed.data.password, user.password))) {
      return NextResponse.json({ error: 'That password is not right.' }, { status: 400 })
    }

    const second = await verifySecondFactor(session.user.id, parsed.data.code)
    if (!second.ok) {
      return NextResponse.json({ error: 'That authentication code is not right.' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null },
      }),
      // Codes are useless without the secret, and leaving them would let a
      // later re-enrolment inherit stale ones.
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: session.user.id } }),
    ])

    await logAudit(session.user.id, 'auth.2fa_disabled', requestMeta(req))

    return NextResponse.json({ enabled: false })
  } catch (err) {
    logger.error('2FA disable failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not turn off two-factor authentication.')
    return NextResponse.json({ error }, { status })
  }
}
