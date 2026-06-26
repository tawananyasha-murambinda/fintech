import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json()

    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
        expires: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Confirm email error:', err)
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
