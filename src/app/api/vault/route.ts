import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vaults = await prisma.vault.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  const rule = await prisma.roundUpRule.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { vault: true },
  })

  return NextResponse.json({ vaults, roundUpRule: rule })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, targetAmount, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const vault = await prisma.vault.create({
    data: { userId: session.user.id, name, targetAmount, color: color || 'teal' },
  })

  return NextResponse.json(vault)
}
