import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plans = await prisma.debtPlan.findMany({
    where: { userId: session.user.id },
    include: { liability: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { liabilityId, strategy, extraPayment, targetDate } = body

  if (!liabilityId || !strategy) {
    return NextResponse.json({ error: 'Liability and strategy are required' }, { status: 400 })
  }

  const liability = await prisma.liability.findFirst({ where: { id: liabilityId, userId: session.user.id } })
  if (!liability) return NextResponse.json({ error: 'Liability not found' }, { status: 404 })

  const plan = await prisma.debtPlan.create({
    data: {
      userId: session.user.id,
      liabilityId,
      strategy,
      extraPayment: extraPayment ? parseFloat(extraPayment) : 0,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
    include: { liability: true },
  })

  return NextResponse.json(plan)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.debtPlan.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
