import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatWithData } from '@/lib/ai'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  // Load user location for AI context
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { city: true, country: true, currency: true },
  })
  const userLocation = user?.city ? { city: user.city, country: user.country ?? undefined } : null

  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'user', content: message },
  })

  const history = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const [transactions, budgets, goals, debts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    prisma.budget.findMany({
      where: { userId: session.user.id },
    }),
    prisma.goal.findMany({
      where: { userId: session.user.id },
    }),
    prisma.debtPlan.findMany({
      where: { userId: session.user.id },
      include: { liability: true },
    }),
  ])

  const txData = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    amount: t.amount,
    direction: t.direction as 'credit' | 'debit',
    description: t.description,
    merchantName: t.merchantName ?? undefined,
    merchantCategory: t.merchantCategory ?? undefined,
    merchantCity: t.merchantCity ?? undefined,
    status: t.status as 'posted' | 'pending',
  }))

  const budgetData = budgets.map((b) => ({
    category: b.category,
    amount: b.amount,
    period: b.period,
    spent: 0,
    remaining: b.amount,
  }))

  const goalData = goals.map((g) => ({
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline?.toISOString() ?? null,
  }))

  const debtData = debts.map((d) => ({
    strategy: d.strategy,
    extraPayment: d.extraPayment,
    liability: d.liability
      ? { name: d.liability.name, balance: d.liability.balance, interestRate: d.liability.interestRate }
      : null,
  }))

  const convHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const reply = await chatWithData(
    message,
    txData,
    convHistory.slice(0, -1),
    { budgets: budgetData, goals: goalData, debts: debtData, userLocation: userLocation || undefined, currency: user?.currency }
  )

  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'assistant', content: reply },
  })

  return NextResponse.json({ reply })
}
