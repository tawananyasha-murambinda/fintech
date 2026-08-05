import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAudit, requestMeta } from '@/lib/audit'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/account/delete — permanent GDPR deletion of the account.
// Requires the user to type "DELETE" and, when the account has a password,
// to confirm the current password.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { confirm?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm permanent deletion.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (user?.password) {
      const valid = await bcrypt.compare(body.password || '', user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password. Enter your password to delete your account.' }, { status: 403 })
      }
    }

    await prisma.user.delete({ where: { id: session.user.id } })

    await logAudit(session.user.id, 'account.delete', requestMeta(req))

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Account deletion failed', { userId: session.user.id })
    const { error, status } = errorResponse(err, 'We could not delete your account right now.')
    return NextResponse.json({ error }, { status })
  }
}
