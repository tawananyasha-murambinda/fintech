import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseLimit } from '@/lib/pagination'
import { parseSearchQuery } from '@/lib/search-query'
import { sum } from '@/lib/money'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/transactions/search?q=coffee over £5 last month
//
// The previous version collected every understood part of the query into one
// OR, so "coffee over 5" returned everything containing "coffee" *plus*
// everything over £5 — the more precise the query, the more results came back.
// Each understood part is now a constraint that narrows, which is what a search
// box is for.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = parseLimit(searchParams.get('limit'), 25, 100)

  if (q.trim().length < 2) {
    return NextResponse.json({ transactions: [], parsed: null, total: 0 })
  }

  try {
    const parsed = parseSearchQuery(q)

    // Every clause is an AND. Free text still searches across merchant,
    // description and category, because the user does not know which field
    // holds the word they remember.
    const and: any[] = [{ userId: session.user.id }]

    if (parsed.text) {
      and.push({
        OR: [
          { description: { contains: parsed.text, mode: 'insensitive' } },
          { merchantName: { contains: parsed.text, mode: 'insensitive' } },
        ],
      })
    }
    if (parsed.category) and.push({ merchantCategory: parsed.category })
    if (parsed.direction) and.push({ direction: parsed.direction })
    if (parsed.from) and.push({ date: { gte: parsed.from } })
    if (parsed.to) and.push({ date: { lt: parsed.to } })

    // Amounts are stored with the sign convention of their direction, so the
    // comparison is on magnitude.
    if (parsed.minAmount !== null) {
      and.push({ OR: [{ amount: { gte: parsed.minAmount } }, { amount: { lte: -parsed.minAmount } }] })
    }
    if (parsed.maxAmount !== null) {
      and.push({ amount: { gte: -parsed.maxAmount, lte: parsed.maxAmount } })
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { AND: and },
        orderBy: { date: 'desc' },
        take: limit,
      }),
      prisma.transaction.count({ where: { AND: and } }),
    ])

    return NextResponse.json({
      transactions,
      total,
      // Echoed back so the UI can show what was understood as removable chips —
      // the user can see why a result set is narrow instead of guessing.
      parsed: {
        text: parsed.text,
        category: parsed.category,
        direction: parsed.direction,
        minAmount: parsed.minAmount,
        maxAmount: parsed.maxAmount,
        from: parsed.from?.toISOString() ?? null,
        to: parsed.to?.toISOString() ?? null,
        matched: parsed.matched,
      },
      matchedTotal: sum(transactions.map((t) => Math.abs(t.amount))),
    })
  } catch (err) {
    logger.error('Transaction search failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not run that search.')
    return NextResponse.json({ error }, { status })
  }
}
