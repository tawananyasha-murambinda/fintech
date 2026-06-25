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

  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'user', content: message },
  })

  const history = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 100,
  })

  const txData = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    amount: t.amount,
    direction: t.direction as 'credit' | 'debit',
    description: t.description,
    merchantName: t.merchantName ?? undefined,
    merchantCategory: t.merchantCategory ?? undefined,
    status: t.status as 'posted' | 'pending',
  }))

  const convHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const reply = await chatWithData(message, txData, convHistory.slice(0, -1))

  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'assistant', content: reply },
  })

  return NextResponse.json({ reply })
}
