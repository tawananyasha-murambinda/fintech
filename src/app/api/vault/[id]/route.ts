import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vault = await prisma.vault.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!vault) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { amount, name, targetAmount, color } = await req.json()

  const data: any = {}
  if (typeof amount === 'number') data.currentAmount = { increment: amount }
  if (name) data.name = name
  if (targetAmount !== undefined) data.targetAmount = targetAmount
  if (color) data.color = color

  const updated = await prisma.vault.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.vault.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
