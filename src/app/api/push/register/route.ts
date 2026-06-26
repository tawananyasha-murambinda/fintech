import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { subscription } = await req.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    })

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already registered' })
    }

    await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push register error:', err)
    return NextResponse.json({ error: 'Failed to register push subscription' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push unregister error:', err)
    return NextResponse.json({ error: 'Failed to unregister' }, { status: 500 })
  }
}
