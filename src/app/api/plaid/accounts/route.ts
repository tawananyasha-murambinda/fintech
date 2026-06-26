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
        transactions: {
          select: { amount: true, direction: true },
        },
      },
    })

    const banksWithBalance = banks.map((b) => {
      const balance = b.transactions.reduce((sum, t) => {
        return sum + (t.direction === 'credit' ? Math.abs(t.amount) : -Math.abs(t.amount))
      }, 0)
      const { transactions, ...rest } = b
      return { ...rest, balance: Math.round(balance * 100) / 100 }
    })

    return NextResponse.json({ banks: banksWithBalance })
  } catch (err) {
    console.error('Plaid accounts list error:', err)
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
  }
}
