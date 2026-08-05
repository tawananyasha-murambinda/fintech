import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nextDueDate } from '@/lib/bills'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()

  const billsWithNextDue = bills.map((bill) => {
    const nextDueDateValue = nextDueDate(bill.dueDate, now)
    const daysUntilDue = Math.ceil((nextDueDateValue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...bill,
      nextDueDate: nextDueDateValue.toISOString(),
      daysUntilDue,
    }
  })

  return NextResponse.json(billsWithNextDue)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, amount, dueDate, frequency, category, reminderDays } = body

    if (!name || amount === undefined || amount === null || amount === '' || dueDate === undefined) {
      return NextResponse.json({ error: 'Name, amount, and due date are required' }, { status: 400 })
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount)
    const parsedDueDate = typeof dueDate === 'number' ? dueDate : parseInt(dueDate, 10)
    const parsedReminder = reminderDays === undefined ? 3 : typeof reminderDays === 'number' ? reminderDays : parseInt(reminderDays, 10)

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    if (Number.isNaN(parsedDueDate) || parsedDueDate < 1 || parsedDueDate > 31) {
      return NextResponse.json({ error: 'Due date must be a day of the month between 1 and 31' }, { status: 400 })
    }

    const bill = await prisma.bill.create({
      data: {
        userId: session.user.id,
        name,
        amount: parsedAmount,
        dueDate: parsedDueDate,
        frequency: frequency || 'monthly',
        category: category || null,
        reminderDays: parsedReminder,
      },
    })

    return NextResponse.json(bill)
  } catch (err) {
    console.error('Bill create error:', err)
    return NextResponse.json({ error: 'Failed to save bill' }, { status: 500 })
  }
}
