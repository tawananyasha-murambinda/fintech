import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/errors'
import crypto from 'crypto'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { limit: 10, windowMs: 15 * 60 * 1000, key: 'register' })
    if (limited) return limited

    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, email: true, name: true },
    })

    // Send verification email
    try {
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
      })
      const { sendVerificationEmail } = await import('@/lib/email')
      await sendVerificationEmail(email, token, '/onboarding')
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr)
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    const { error, status } = errorResponse(
      err,
      'We could not create your account right now. Please try again shortly.'
    )
    return NextResponse.json({ error }, { status })
  }
}
