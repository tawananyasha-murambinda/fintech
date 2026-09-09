import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { generateSecret, otpauthUrl } from '@/lib/totp'
import { encryptSecret } from '@/lib/two-factor'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'
import QRCode from 'qrcode'

// POST /api/auth/2fa/setup — issues a secret and the otpauth:// URI to scan.
//
// The secret is stored immediately but `twoFactorEnabled` stays false until
// the user proves they can generate a code from it, so a half-finished setup
// can never lock someone out of their own account.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(req, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    key: `2fa-setup:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, twoFactorEnabled: true },
    })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already on. Turn it off first to re-enrol.' },
        { status: 409 }
      )
    }

    const secret = generateSecret()
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false },
    })

    const uri = otpauthUrl(secret, user.email)

    // Rendered server-side to a data URI: the QR encoder stays out of the
    // client bundle, and the secret never has to be drawn in the browser.
    const qrDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
    })

    return NextResponse.json({
      // Returned once, at enrolment, so the user can type it into an app that
      // cannot scan. It is never readable again.
      secret,
      otpauthUrl: uri,
      qrDataUrl,
    })
  } catch (err) {
    logger.error('2FA setup failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not start two-factor setup.')
    return NextResponse.json({ error }, { status })
  }
}
