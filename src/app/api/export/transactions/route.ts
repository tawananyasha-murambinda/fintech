import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { canonicalCategory } from '@/lib/categories'
import { toCsv, exportFilename } from '@/lib/csv'
import { errorResponse } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/export/transactions?from=&to=
//
// A spreadsheet of your own transactions — for an accountant, a mortgage
// application, or just to keep. The GDPR export returns JSON, which is correct
// for portability and useless for anyone who wants to open it.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Exports pull the full history; they are not a per-keystroke endpoint.
  const limited = await rateLimit(req, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    key: `export:${session.user.id}`,
    scope: 'user',
  })
  if (limited) return limited

  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter: { gte?: Date; lt?: Date } = {}
    if (from && !Number.isNaN(Date.parse(from))) dateFilter.gte = new Date(from)
    if (to && !Number.isNaN(Date.parse(to))) dateFilter.lt = new Date(to)

    const [transactions, manual] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
        include: { linkedBank: { select: { institutionName: true, accountName: true } } },
        take: 20000,
      }),
      prisma.manualTransaction.findMany({
        where: {
          userId: session.user.id,
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
        take: 20000,
      }),
    ])

    // Bank and manual entries in one sheet: splitting them across two files
    // would mean neither reconciles on its own.
    const rows = [
      ...transactions.map((t) => ({
        Date: t.date.toISOString().slice(0, 10),
        Description: t.description,
        Merchant: t.merchantName ?? '',
        Category: canonicalCategory(t.merchantCategory),
        // Signed, so a spreadsheet SUM over the column is the net movement.
        Amount: (t.direction === 'credit' ? Math.abs(t.amount) : -Math.abs(t.amount)).toFixed(2),
        Direction: t.direction,
        Status: t.status,
        Account: t.linkedBank
          ? `${t.linkedBank.institutionName} — ${t.linkedBank.accountName}`
          : '',
        Source: 'bank',
      })),
      ...manual.map((t) => ({
        Date: t.date.toISOString().slice(0, 10),
        Description: t.description,
        Merchant: t.merchantName ?? '',
        Category: canonicalCategory(t.merchantCategory),
        Amount: (t.direction === 'credit' ? Math.abs(t.amount) : -Math.abs(t.amount)).toFixed(2),
        Direction: t.direction,
        Status: 'posted',
        Account: 'Manual entry',
        Source: 'manual',
      })),
    ].sort((a, b) => b.Date.localeCompare(a.Date))

    const csv = toCsv(rows)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename('fintrack-transactions')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    logger.error('Transaction export failed', { userId: session.user.id, error: err })
    const { error, status } = errorResponse(err, 'We could not build that export.')
    return NextResponse.json({ error }, { status })
  }
}
