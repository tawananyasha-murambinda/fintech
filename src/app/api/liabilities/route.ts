import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const liabilities = await prisma.liability.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { debtPlans: true },
  })

  return NextResponse.json(liabilities)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, balance, interestRate, minPayment, notes } = body

  if (!name || !type || balance === undefined) {
    return NextResponse.json({ error: 'Name, type, and balance are required' }, { status: 400 })
  }

  const liability = await prisma.liability.create({
    data: {
      userId: session.user.id,
      name,
      type,
      balance: parseFloat(balance),
      interestRate: interestRate ? parseFloat(interestRate) : null,
      minPayment: minPayment ? parseFloat(minPayment) : null,
      notes,
    },
  })

  return NextResponse.json(liability)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existing = await prisma.liability.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.liability.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.balance !== undefined && { balance: parseFloat(data.balance) }),
      ...(data.interestRate !== undefined && { interestRate: data.interestRate ? parseFloat(data.interestRate) : null }),
      ...(data.minPayment !== undefined && { minPayment: data.minPayment ? parseFloat(data.minPayment) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.liability.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
