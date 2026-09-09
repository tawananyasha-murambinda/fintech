import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logAudit, requestMeta } from '@/lib/audit'

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { limit: 10, windowMs: 15 * 60 * 1000, key: 'reset-password' })
    if (limited) return limited

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { token, email, password } = parsed.data

    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: `reset:${email}`,
        token,
        expires: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    await prisma.user.update({
      where: { email },
      // A reset is the flow someone uses when they think they are compromised,
      // so every existing session for the account is invalidated.
      data: { password: hashedPassword, sessionsValidFrom: new Date() },
    })

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `reset:${email}`, token } },
    })

    if (user) {
      await logAudit(user.id, 'auth.password_reset', requestMeta(req))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    const { error, status } = errorResponse(
      err,
      'We could not reset your password right now. Please try again later.'
    )
    return NextResponse.json({ error }, { status })
  }
}
