import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await prisma.taxEntry.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { year, type, description, amount, category, date } = body

  if (!year || !type || !description || amount === undefined) {
    return NextResponse.json({ error: 'Year, type, description, and amount are required' }, { status: 400 })
  }

  const entry = await prisma.taxEntry.create({
    data: {
      userId: session.user.id,
      year: parseInt(year),
      type,
      description,
      amount: parseFloat(amount),
      category: category || null,
      date: date ? new Date(date) : null,
    },
  })

  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.taxEntry.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
