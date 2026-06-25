import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id, isActive: true },
  })

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const upcoming = bills
    .map((bill) => {
      let nextDueDate = new Date(currentYear, currentMonth, bill.dueDate)
      if (nextDueDate < now) {
        nextDueDate = new Date(currentYear, currentMonth + 1, bill.dueDate)
      }
      const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { ...bill, nextDueDate: nextDueDate.toISOString(), daysUntilDue }
    })
    .filter((b) => b.daysUntilDue <= (b.reminderDays || 3) && b.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  return NextResponse.json(upcoming)
}
