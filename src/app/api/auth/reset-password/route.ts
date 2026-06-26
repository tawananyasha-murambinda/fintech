import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function POST(req: NextRequest) {
  try {
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

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `reset:${email}`, token } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
