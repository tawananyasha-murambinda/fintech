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

  try {
    const { amount, name, targetAmount, color } = await req.json()

    const data: any = {}
    if (typeof amount === 'number') {
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 })
      }
      data.currentAmount = { increment: amount }
    }
    if (name) data.name = name
    if (targetAmount !== undefined && targetAmount !== null) {
      const target = typeof targetAmount === 'number' ? targetAmount : parseFloat(targetAmount)
      if (Number.isNaN(target) || target < 0) {
        return NextResponse.json({ error: 'Target amount must be a non-negative number' }, { status: 400 })
      }
      data.targetAmount = target
    }
    if (color) data.color = color

    const updated = await prisma.vault.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Vault update error:', err)
    return NextResponse.json({ error: 'Failed to update vault' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vault = await prisma.vault.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!vault) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.vault.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
