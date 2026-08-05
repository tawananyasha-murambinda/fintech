import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeDate } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const goal = await prisma.goal.findFirst({ where: { id, userId: session.user.id } })
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const deadline = body.deadline === undefined ? undefined : safeDate(body.deadline)
  if (body.deadline !== undefined && body.deadline && !deadline) {
    return NextResponse.json({ error: 'Invalid deadline date' }, { status: 400 })
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.currentAmount !== undefined && { currentAmount: body.currentAmount }),
      ...(deadline !== undefined && { deadline }),
      ...(body.color !== undefined && { color: body.color }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.goal.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
