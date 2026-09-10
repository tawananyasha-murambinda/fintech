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
        currentBalance: true,
        availableBalance: true,
        balanceUpdatedAt: true,
        transactions: {
          select: { amount: true, direction: true },
        },
      },
    })

    const banksWithBalance = banks.map((b) => {
      // Credits minus debits over the imported window. This is net cashflow,
      // not a balance — it was previously returned as `balance`, so the home
      // screen showed 90 days of net movement where the account balance
      // should be. Kept, correctly named, because it is still useful.
      const netFlow = b.transactions.reduce(
        (sum, t) => sum + (t.direction === 'credit' ? Math.abs(t.amount) : -Math.abs(t.amount)),
        0
      )
      const { transactions, currentBalance, ...rest } = b

      return {
        ...rest,
        // Null rather than a stand-in when Plaid has not reported one, so the
        // UI can say "not available" instead of showing a confident wrong number.
        balance: currentBalance,
        netFlow: Math.round(netFlow * 100) / 100,
        hasRealBalance: currentBalance !== null,
      }
    })

    return NextResponse.json({ banks: banksWithBalance })
  } catch (err) {
    console.error('Plaid accounts list error:', err)
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
  }
}
