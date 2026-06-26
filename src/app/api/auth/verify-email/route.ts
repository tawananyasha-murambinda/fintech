import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    const { sendVerificationEmail } = await import('@/lib/email')
    await sendVerificationEmail(email, token)

    return NextResponse.json({ success: true, message: 'Verification email sent' })
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

    const stored = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } },
    })

    if (!stored) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (stored.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } })
      return NextResponse.json({ error: 'Token expired. Request a new one.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Verify token error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
