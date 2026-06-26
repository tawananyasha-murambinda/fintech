import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
    }

    if (!user.password) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires,
      },
    })

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
  }
}
