import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vaultId, enabled } = await req.json()

  const existing = await prisma.roundUpRule.findFirst({
    where: { userId: session.user.id, isActive: true },
  })

  if (!enabled) {
    if (existing) {
      await prisma.roundUpRule.update({
        where: { id: existing.id },
        data: { isActive: false },
      })
    }
    return NextResponse.json({ enabled: false })
  }

  if (existing) {
    const updated = await prisma.roundUpRule.update({
      where: { id: existing.id },
      data: { vaultId, isActive: true },
    })
    return NextResponse.json({ enabled: true, rule: updated })
  }

  const rule = await prisma.roundUpRule.create({
    data: { userId: session.user.id, vaultId },
  })

  return NextResponse.json({ enabled: true, rule })
}
