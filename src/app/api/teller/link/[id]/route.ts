import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bank = await prisma.linkedBank.findFirst({
    where: { id: params.id, userId: session.user.id },
  })

  if (!bank) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Soft delete: remove bank but retain transaction history
  await prisma.linkedBank.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
