import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/change-email — change email address
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { newEmail, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // OAuth-only accounts without a password cannot change email this way
    if (user.password) {
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Password is incorrect' }, { status: 401 })
      }
    }

    if (user.email === newEmail) {
      return NextResponse.json({ error: 'New email must be different from current email' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: newEmail, emailVerified: null },
    })

    // Send verification email for new address
    try {
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.verificationToken.create({
        data: { identifier: newEmail, token, expires },
      })
      const { sendEmailChangeVerification } = await import('@/lib/email')
      await sendEmailChangeVerification(newEmail, token)
    } catch (emailErr) {
      console.error('Failed to send change email verification:', emailErr)
    }

    return NextResponse.json({ success: true, email: newEmail })
  } catch (err) {
    console.error('Change email error:', err)
    return NextResponse.json({ error: 'Failed to change email' }, { status: 500 })
  }
}
