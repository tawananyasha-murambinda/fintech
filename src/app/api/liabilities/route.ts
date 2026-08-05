import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toFiniteNumber } from '@/lib/validate'

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

  const parsedBalance = toFiniteNumber(balance)
  if (parsedBalance === null || parsedBalance < 0) {
    return NextResponse.json({ error: 'Balance must be a non-negative number' }, { status: 400 })
  }
  const parsedRate = interestRate === undefined ? null : toFiniteNumber(interestRate)
  const parsedMinPayment = minPayment === undefined ? null : toFiniteNumber(minPayment)

  const liability = await prisma.liability.create({
    data: {
      userId: session.user.id,
      name,
      type,
      balance: parsedBalance,
      interestRate: parsedRate,
      minPayment: parsedMinPayment,
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

  const balance = data.balance === undefined ? undefined : toFiniteNumber(data.balance)
  const interestRate = data.interestRate === undefined ? undefined : data.interestRate === null || data.interestRate === '' ? null : toFiniteNumber(data.interestRate)
  const minPayment = data.minPayment === undefined ? undefined : data.minPayment === null || data.minPayment === '' ? null : toFiniteNumber(data.minPayment)

  if (balance === null && data.balance !== undefined) {
    return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 })
  }
  if (interestRate === null && data.interestRate !== undefined && data.interestRate !== null && data.interestRate !== '') {
    return NextResponse.json({ error: 'Interest rate must be a number' }, { status: 400 })
  }
  if (minPayment === null && data.minPayment !== undefined && data.minPayment !== null && data.minPayment !== '') {
    return NextResponse.json({ error: 'Minimum payment must be a number' }, { status: 400 })
  }

  const updateBalance = balance === null ? undefined : balance
  const updateInterestRate = interestRate === undefined ? undefined : interestRate
  const updateMinPayment = minPayment === undefined ? undefined : minPayment

  const updated = await prisma.liability.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(updateBalance !== undefined && { balance: updateBalance }),
      ...(updateInterestRate !== undefined && { interestRate: updateInterestRate }),
      ...(updateMinPayment !== undefined && { minPayment: updateMinPayment }),
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
