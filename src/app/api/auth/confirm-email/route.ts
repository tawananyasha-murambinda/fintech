import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/errors'

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
    const { error, status } = errorResponse(
      err,
      'We could not verify your email right now. Please try again later.'
    )
    return NextResponse.json({ error }, { status })
  }
}
