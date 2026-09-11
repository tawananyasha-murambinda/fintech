import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sharedScope, isMember } from '@/lib/households'
import { nextDueDate, followingDueDate, daysUntilDue, monthlyEquivalent, isBillFrequency } from '@/lib/bills'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Includes bills other household members have shared, not just your own.
  const bills = await prisma.bill.findMany({
    where: await sharedScope(session.user.id),
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()

  const billsWithNextDue = bills.map((bill) => {
    const next = nextDueDate(bill, now)

    return {
      ...bill,
      nextDueDate: next.toISOString(),
      followingDueDate: followingDueDate(bill, now).toISOString(),
      daysUntilDue: daysUntilDue(next, now),
      // What this bill costs per month once its frequency is accounted for,
      // so a yearly £120 bill contributes £10 to the monthly total, not £120.
      monthlyEquivalent: monthlyEquivalent(bill.amount, bill.frequency),
    }
  })

  const monthlyTotal = billsWithNextDue
    .filter((b) => b.isActive)
    .reduce((total, b) => total + b.monthlyEquivalent, 0)

  return NextResponse.json({
    bills: billsWithNextDue.sort(
      (a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    ),
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, amount, dueDate, frequency, category, reminderDays, anchorDate, householdId } = body

    if (!name || amount === undefined || amount === null || amount === '' || dueDate === undefined) {
      return NextResponse.json({ error: 'Name, amount, and due date are required' }, { status: 400 })
    }

    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount)
    const parsedDueDate = typeof dueDate === 'number' ? dueDate : parseInt(dueDate, 10)
    const parsedReminder = reminderDays === undefined ? 3 : typeof reminderDays === 'number' ? reminderDays : parseInt(reminderDays, 10)

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    // Sharing is only allowed into a household the user actually belongs to;
    // otherwise anyone holding an id could push a bill into someone's home.
    let sharedWith: string | null = null
    if (typeof householdId === 'string' && householdId) {
      if (!(await isMember(session.user.id, householdId))) {
        return NextResponse.json({ error: 'You are not a member of that household.' }, { status: 403 })
      }
      sharedWith = householdId
    }

    const resolvedFrequency = isBillFrequency(frequency) ? frequency : 'monthly'

    // Weekly bills are keyed on a weekday (0 = Sunday), everything else on a
    // day of the month.
    if (resolvedFrequency === 'weekly') {
      if (Number.isNaN(parsedDueDate) || parsedDueDate < 0 || parsedDueDate > 6) {
        return NextResponse.json({ error: 'For a weekly bill, pick a day of the week.' }, { status: 400 })
      }
    } else if (Number.isNaN(parsedDueDate) || parsedDueDate < 1 || parsedDueDate > 31) {
      return NextResponse.json({ error: 'Due date must be a day of the month between 1 and 31' }, { status: 400 })
    }

    // Quarterly and yearly bills are meaningless without knowing which month
    // they fall in, so an anchor is required for them.
    const parsedAnchor = anchorDate ? new Date(anchorDate) : null
    if (parsedAnchor && Number.isNaN(parsedAnchor.getTime())) {
      return NextResponse.json({ error: 'Start date is not a valid date.' }, { status: 400 })
    }
    if ((resolvedFrequency === 'quarterly' || resolvedFrequency === 'yearly') && !parsedAnchor) {
      return NextResponse.json(
        { error: `A ${resolvedFrequency} bill needs a start date so we know which month it falls in.` },
        { status: 400 }
      )
    }

    const bill = await prisma.bill.create({
      data: {
        userId: session.user.id,
        name,
        amount: parsedAmount,
        dueDate: parsedDueDate,
        frequency: resolvedFrequency,
        anchorDate: parsedAnchor,
        householdId: sharedWith,
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
