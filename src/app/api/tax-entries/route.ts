import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeDate } from '@/lib/validate'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [entries, deductibleSplits] = await Promise.all([
    prisma.taxEntry.findMany({
      where: { userId: session.user.id },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    }),
    // Transaction splits marked as business spend. These were recorded and
    // then went nowhere — the tax organiser only ever showed entries typed in
    // by hand, so the deductible flag was decoration.
    prisma.transactionSplit.findMany({
      where: { userId: session.user.id, deductible: true },
      include: {
        transaction: { select: { date: true, merchantName: true, description: true } },
        manual: { select: { date: true, merchantName: true, description: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ])

  // Presented alongside manual entries in the same shape, flagged by source so
  // the UI can show where each came from and link back to the transaction.
  const fromSplits = deductibleSplits.map((split) => {
    const parent = split.transaction ?? split.manual
    const date = parent?.date ?? split.createdAt
    return {
      id: `split-${split.id}`,
      year: date.getFullYear(),
      type: 'expense' as const,
      description:
        split.note || parent?.merchantName || parent?.description || 'Business expense',
      amount: split.amount,
      category: split.category,
      date,
      source: 'split' as const,
      transactionId: split.transactionId,
      manualId: split.manualId,
    }
  })

  return NextResponse.json({
    entries: entries.map((e) => ({ ...e, source: 'manual' as const })),
    fromSplits,
    // One figure the page can show without re-deriving it.
    deductibleTotal:
      Math.round(fromSplits.reduce((sum, s) => sum + s.amount, 0) * 100) / 100,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { year, type, description, amount, category, date } = body

  if (!year || !type || !description || amount === undefined) {
    return NextResponse.json({ error: 'Year, type, description, and amount are required' }, { status: 400 })
  }

  const entryDate = safeDate(date)
  if (date && !entryDate) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const entry = await prisma.taxEntry.create({
    data: {
      userId: session.user.id,
      year: parseInt(year, 10),
      type,
      description,
      amount: parseFloat(amount),
      category: category || null,
      date: entryDate,
    },
  })

  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.taxEntry.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
