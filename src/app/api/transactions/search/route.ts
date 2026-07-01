import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  if (q.length < 2) return NextResponse.json({ transactions: [] })

  const where: any = { userId: session.user.id }

  const conditions: any[] = [
    { description: { contains: q, mode: 'insensitive' } },
    { merchantName: { contains: q, mode: 'insensitive' } },
    { merchantCategory: { contains: q, mode: 'insensitive' } },
  ]

  const amountMatch = q.match(/\$?(\d+(?:\.\d{1,2})?)/)
  if (amountMatch) {
    const amt = parseFloat(amountMatch[1])
    if (amt > 0) {
      if (q.includes('>') || q.includes('over') || q.includes('more') || q.includes('above')) {
        conditions.push({ amount: { gte: amt } })
      } else if (q.includes('<') || q.includes('under') || q.includes('less') || q.includes('below')) {
        conditions.push({ amount: { lte: amt } })
      } else {
        conditions.push({ amount: { gte: amt - 5, lte: amt + 5 } })
      }
    }
  }

  // Date range parsing
  if (/\b(last|past)\s+month\b/i.test(q)) {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    conditions.push({ date: { gte: d } })
  } else if (/\b(this|current)\s+month\b/i.test(q)) {
    const d = new Date()
    d.setDate(1)
    conditions.push({ date: { gte: d } })
  } else if (/\b(last|past)\s+week\b/i.test(q)) {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    conditions.push({ date: { gte: d } })
  } else if (/\b(last|past)\s+(quarter|3\s*months?)\b/i.test(q)) {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    conditions.push({ date: { gte: d } })
  }

  // Direction parsing
  if (/\b(income|earned|deposit|credit|received|got\s+paid)\b/i.test(q)) {
    conditions.push({ direction: 'credit' })
  } else if (/\b(spent|expense|debit|paid|bought|purchase|charge)\b/i.test(q)) {
    conditions.push({ direction: 'debit' })
  }

  where.OR = conditions

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      id: true,
      date: true,
      amount: true,
      direction: true,
      description: true,
      merchantName: true,
      merchantCategory: true,
    },
  })

  return NextResponse.json({
    transactions: transactions.map(t => ({
      ...t,
      date: t.date.toISOString(),
    })),
  })
}
