import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).optional(),
})

// GET /api/auth/profile — return current user profile
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, createdAt: true, password: true, currency: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
        hasPassword: !!user.password,
        currency: user.currency,
      },
    })
  } catch (err) {
    console.error('Profile GET error:', err)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

// PUT /api/auth/profile — update current user profile
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const data: { name?: string; currency?: string } = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.currency !== undefined) data.currency = parsed.data.currency
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true, currency: true },
    })

    return NextResponse.json({ user })
  } catch (err) {
    console.error('Profile PUT error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
