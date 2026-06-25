import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/plaid/accounts — list linked bank accounts for the current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const banks = await prisma.linkedBank.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        institutionName: true,
        accountType: true,
        accountName: true,
        currency: true,
        lastSynced: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ banks })
  } catch (err) {
    console.error('Plaid accounts list error:', err)
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
  }
}
