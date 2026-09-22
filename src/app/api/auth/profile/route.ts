import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { LOCALES } from '@/lib/i18n'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).optional(),
  locale: z.enum(LOCALES).optional(),
  notifyPush: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyBills: z.boolean().optional(),
  notifyAlerts: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
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
      select: { id: true, name: true, email: true, image: true, createdAt: true, password: true, currency: true, locale: true, notifyPush: true, notifyEmail: true, notifyBills: true, notifyAlerts: true, notifyGoals: true },
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
        locale: user.locale,
        notifyPush: user.notifyPush,
        notifyEmail: user.notifyEmail,
        notifyBills: user.notifyBills,
        notifyAlerts: user.notifyAlerts,
        notifyGoals: user.notifyGoals,
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

    const data: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.currency !== undefined) data.currency = parsed.data.currency
    if (parsed.data.locale !== undefined) data.locale = parsed.data.locale
    // Preferences the nightly job reads, so a mute actually takes effect.
    for (const key of ['notifyPush', 'notifyEmail', 'notifyBills', 'notifyAlerts', 'notifyGoals'] as const) {
      if (parsed.data[key] !== undefined) data[key] = parsed.data[key]
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true, currency: true, locale: true },
    })

    // Cached analyses have the currency symbol written into their prose, so a
    // change here has to discard them. Without this the app shows figures in
    // the new currency while the AI's sentences keep quoting the old one for
    // up to an hour.
    if (parsed.data.currency !== undefined) {
      await prisma.aiInsight
        .deleteMany({ where: { userId: session.user.id } })
        .catch(() => undefined)
    }

    return NextResponse.json({ user })
  } catch (err) {
    console.error('Profile PUT error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
