import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toFiniteNumber } from '@/lib/validate'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const investments = await prisma.investment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(investments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, shares, costBasis, currentPrice, ticker, notes } = body

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
  }

  const parsedShares = shares === undefined ? null : toFiniteNumber(shares)
  const parsedCostBasis = costBasis === undefined ? null : toFiniteNumber(costBasis)
  const parsedPrice = currentPrice === undefined ? null : toFiniteNumber(currentPrice)

  if (parsedShares === null && shares !== undefined) {
    return NextResponse.json({ error: 'Shares must be a number' }, { status: 400 })
  }
  if (parsedCostBasis === null && costBasis !== undefined) {
    return NextResponse.json({ error: 'Cost basis must be a number' }, { status: 400 })
  }
  if (parsedPrice === null && currentPrice !== undefined) {
    return NextResponse.json({ error: 'Current price must be a number' }, { status: 400 })
  }

  const investment = await prisma.investment.create({
    data: {
      userId: session.user.id,
      name,
      type,
      shares: parsedShares,
      costBasis: parsedCostBasis,
      currentPrice: parsedPrice,
      ticker: ticker || null,
      notes,
    },
  })

  return NextResponse.json(investment)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existing = await prisma.investment.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parseField = (raw: unknown) => (raw === undefined ? undefined : raw === null || raw === '' ? null : toFiniteNumber(raw))

  const shares = parseField(data.shares)
  const costBasis = parseField(data.costBasis)
  const currentPrice = parseField(data.currentPrice)

  if (shares === null && data.shares !== undefined && data.shares !== null && data.shares !== '') {
    return NextResponse.json({ error: 'Shares must be a number' }, { status: 400 })
  }
  if (costBasis === null && data.costBasis !== undefined && data.costBasis !== null && data.costBasis !== '') {
    return NextResponse.json({ error: 'Cost basis must be a number' }, { status: 400 })
  }
  if (currentPrice === null && data.currentPrice !== undefined && data.currentPrice !== null && data.currentPrice !== '') {
    return NextResponse.json({ error: 'Current price must be a number' }, { status: 400 })
  }

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(shares !== undefined && { shares }),
      ...(costBasis !== undefined && { costBasis }),
      ...(currentPrice !== undefined && { currentPrice }),
      ...(data.ticker !== undefined && { ticker: data.ticker }),
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

  await prisma.investment.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
