import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await prisma.categorizationRule.findMany({
    where: { userId: session.user.id },
    orderBy: { priority: 'desc' },
  })

  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { matchType, matchValue, category, priority } = body

  if (!matchType || !matchValue || !category) {
    return NextResponse.json({ error: 'matchType, matchValue, and category are required' }, { status: 400 })
  }

  const rule = await prisma.categorizationRule.create({
    data: {
      userId: session.user.id,
      matchType,
      matchValue,
      category,
      priority: priority || 0,
    },
  })

  return NextResponse.json(rule)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.categorizationRule.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existing = await prisma.categorizationRule.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.categorizationRule.update({
    where: { id },
    data: {
      ...(data.matchType !== undefined && { matchType: data.matchType }),
      ...(data.matchValue !== undefined && { matchValue: data.matchValue }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  return NextResponse.json(updated)
}
