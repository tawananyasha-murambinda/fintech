import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  date: z.string().optional(),
  amount: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z.number({ message: 'Amount must be a number' }).finite().positive()
  ),
  direction: z.enum(['credit', 'debit']),
  description: z.string().min(1).max(500),
  merchantName: z.string().max(200).optional().nullable(),
  merchantCategory: z.string().max(100).optional().nullable(),
})

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

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const { date, amount, direction, description, merchantName, merchantCategory } = parsed.data

    let txDate = new Date()
    if (date) {
      const parsedDate = new Date(date)
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      }
      txDate = parsedDate
    }

    const tx = await prisma.manualTransaction.create({
      data: {
        userId: session.user.id,
        date: txDate,
        amount,
        direction,
        description,
        merchantName: merchantName || null,
        merchantCategory: merchantCategory || null,
      },
    })

    return NextResponse.json(tx)
  } catch (err) {
    console.error('Manual transaction create error:', err)
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 })
  }
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
