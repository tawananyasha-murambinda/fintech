import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nextDueDate, daysUntilDue } from '@/lib/bills'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id, isActive: true },
  })

  const now = new Date()

  const upcoming = bills
    .map((bill) => {
      const next = nextDueDate(bill, now)
      return { ...bill, nextDueDate: next.toISOString(), daysUntilDue: daysUntilDue(next, now) }
    })
    .filter((b) => b.daysUntilDue <= (b.reminderDays || 3) && b.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  return NextResponse.json(upcoming)
}
