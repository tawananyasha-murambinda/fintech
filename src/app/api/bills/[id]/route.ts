import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bill = await prisma.bill.findFirst({ where: { id, userId: session.user.id } })
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.bill.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.frequency !== undefined && { frequency: body.frequency }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.reminderDays !== undefined && { reminderDays: body.reminderDays }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.bill.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
