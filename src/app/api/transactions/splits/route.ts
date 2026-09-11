import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canonicalCategory } from '@/lib/categories'
import { sum, round } from '@/lib/money'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// Splitting one transaction across categories — the £80 supermarket run that
// was £30 of work supplies. Without it every transaction has to be wholly one
// thing, which makes the tax organiser a guess.

const splitSchema = z.object({
  transactionId: z.string().optional(),
  manualId: z.string().optional(),
  splits: z
    .array(
      z.object({
        amount: z.number().positive(),
        category: z.string().min(1),
        note: z.string().max(200).optional(),
        deductible: z.boolean().optional(),
      })
    )
    .min(1)
    .max(10),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const transactionId = searchParams.get('transactionId')
  const manualId = searchParams.get('manualId')

  const splits = await prisma.transactionSplit.findMany({
    where: {
      userId: session.user.id,
      ...(transactionId ? { transactionId } : {}),
      ...(manualId ? { manualId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ splits, total: sum(splits.map((s) => s.amount)) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = splitSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Provide a transaction and at least one split with a positive amount.' },
        { status: 400 }
      )
    }

    const { transactionId, manualId, splits } = parsed.data
    if (!transactionId && !manualId) {
      return NextResponse.json({ error: 'Provide a transaction to split.' }, { status: 400 })
    }

    // Ownership is checked here rather than trusted from the body — otherwise
    // a guessed id would let anyone attach splits to another user's spending.
    const parent = transactionId
      ? await prisma.transaction.findFirst({
          where: { id: transactionId, userId: session.user.id },
          select: { amount: true },
        })
      : await prisma.manualTransaction.findFirst({
          where: { id: manualId!, userId: session.user.id },
          select: { amount: true },
        })

    if (!parent) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const total = sum(splits.map((s) => s.amount))
    const parentAmount = round(Math.abs(parent.amount))

    // Splits that add up to more than the transaction would inflate category
    // totals and, through the tax organiser, a deduction claim.
    if (total > parentAmount + 0.01) {
      return NextResponse.json(
        {
          error: `Those splits come to ${total.toFixed(2)}, which is more than the ${parentAmount.toFixed(2)} transaction.`,
        },
        { status: 400 }
      )
    }

    // Replacing rather than appending: editing a split set should not silently
    // double it.
    const created = await prisma.$transaction([
      prisma.transactionSplit.deleteMany({
        where: {
          userId: session.user.id,
          ...(transactionId ? { transactionId } : { manualId }),
        },
      }),
      prisma.transactionSplit.createMany({
        data: splits.map((s) => ({
          userId: session.user.id,
          transactionId: transactionId ?? null,
          manualId: manualId ?? null,
          amount: s.amount,
          category: canonicalCategory(s.category),
          note: s.note ?? null,
          deductible: s.deductible ?? false,
        })),
      }),
    ])

    return NextResponse.json({
      created: created[1].count,
      total,
      remainder: round(parentAmount - total),
    })
  } catch (err) {
    logger.error('Split save failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not save that split.')
    return NextResponse.json({ error }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const transactionId = searchParams.get('transactionId')
  const manualId = searchParams.get('manualId')
  if (!transactionId && !manualId) {
    return NextResponse.json({ error: 'Provide a transaction.' }, { status: 400 })
  }

  const { count } = await prisma.transactionSplit.deleteMany({
    where: {
      userId: session.user.id,
      ...(transactionId ? { transactionId } : { manualId }),
    },
  })

  return NextResponse.json({ deleted: count })
}
