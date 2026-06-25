import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const investment = await prisma.investment.create({
    data: {
      userId: session.user.id,
      name,
      type,
      shares: shares ? parseFloat(shares) : null,
      costBasis: costBasis ? parseFloat(costBasis) : null,
      currentPrice: currentPrice ? parseFloat(currentPrice) : null,
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

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.shares !== undefined && { shares: data.shares ? parseFloat(data.shares) : null }),
      ...(data.costBasis !== undefined && { costBasis: data.costBasis ? parseFloat(data.costBasis) : null }),
      ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice ? parseFloat(data.currentPrice) : null }),
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
