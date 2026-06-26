import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiCategorize, applyRules } from '@/lib/categorize'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { merchantName, description, transactionId, category } = await req.json()
  if (!merchantName && !description && !category) {
    return NextResponse.json({ error: 'Merchant name or description required' }, { status: 400 })
  }

  // Direct category assignment (user-specified)
  if (category && merchantName) {
    if (transactionId) {
      await prisma.transaction.update({
        where: { id: transactionId, userId: session.user.id },
        data: { merchantCategory: category },
      })
    }
    return NextResponse.json({ category, source: 'manual' })
  }

  const rules = await prisma.categorizationRule.findMany({
    where: { userId: session.user.id, isActive: true },
  })

  const ruleResult = applyRules(merchantName || '', description || '', rules)
  if (ruleResult) {
    if (transactionId) {
      await prisma.transaction.update({
        where: { id: transactionId, userId: session.user.id },
        data: { merchantCategory: ruleResult },
      })
    }
    return NextResponse.json({ category: ruleResult, source: 'rule' })
  }

  const aiResult = await aiCategorize(merchantName || '', description || '')
  if (aiResult) {
    if (transactionId) {
      await prisma.transaction.update({
        where: { id: transactionId, userId: session.user.id },
        data: { merchantCategory: aiResult },
      })
    }
    return NextResponse.json({ category: aiResult, source: 'ai' })
  }

  return NextResponse.json({ category: null, source: 'none' })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uncategorized = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      merchantCategory: null,
      direction: 'debit',
    },
    take: 50,
    orderBy: { date: 'desc' },
    select: { id: true, merchantName: true, description: true, merchantCategory: true },
  })

  return NextResponse.json(uncategorized)
}
