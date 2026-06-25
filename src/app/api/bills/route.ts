import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const billsWithNextDue = bills.map((bill) => {
    let nextDueDate = new Date(currentYear, currentMonth, bill.dueDate)
    if (nextDueDate < now) {
      nextDueDate = new Date(currentYear, currentMonth + 1, bill.dueDate)
    }
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...bill,
      nextDueDate: nextDueDate.toISOString(),
      daysUntilDue,
    }
  })

  return NextResponse.json(billsWithNextDue)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, amount, dueDate, frequency, category, reminderDays } = body

  if (!name || !amount || dueDate === undefined) {
    return NextResponse.json({ error: 'Name, amount, and due date are required' }, { status: 400 })
  }

  const bill = await prisma.bill.create({
    data: {
      userId: session.user.id,
      name,
      amount,
      dueDate,
      frequency: frequency || 'monthly',
      category: category || null,
      reminderDays: reminderDays ?? 3,
    },
  })

  return NextResponse.json(bill)
}
