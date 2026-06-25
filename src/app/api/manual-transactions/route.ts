import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.manualTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 50,
  })

  return NextResponse.json(transactions.map(t => ({ ...t, receiptUrl: t.receiptId ? `/api/receipts/${t.receiptId}` : null })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, amount, direction, description, merchantName, merchantCategory } = body

  if (!date || !amount || !direction || !description) {
    return NextResponse.json({ error: 'Date, amount, direction, and description are required' }, { status: 400 })
  }

  const tx = await prisma.manualTransaction.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      amount: parseFloat(amount),
      direction,
      description,
      merchantName: merchantName || null,
      merchantCategory: merchantCategory || null,
    },
  })

  return NextResponse.json(tx)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.manualTransaction.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
