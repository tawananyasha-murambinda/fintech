import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { getTellerTransactions, getTellerBalance } from '@/lib/teller'

// POST /api/teller/sync — pull latest transactions for all linked accounts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const banks = await prisma.linkedBank.findMany({
    where: { userId: session.user.id },
  })

  if (!banks.length) {
    return NextResponse.json({ synced: 0, transactions: 0 })
  }

  let totalImported = 0

  for (const bank of banks) {
    try {
      const accessToken = decrypt(bank.tellerToken)

      // Get last known transaction to use as cursor
      const lastTx = await prisma.transaction.findFirst({
        where: { linkedBankId: bank.id },
        orderBy: { date: 'desc' },
        select: { tellerId: true },
      })

      const rawTxns = await getTellerTransactions(
        accessToken,
        bank.tellerAccountId,
        { from: lastTx?.tellerId, count: 250 }
      )

      for (const tx of rawTxns) {
        await prisma.transaction.upsert({
          where: { tellerId: tx.id },
          update: {
            status: tx.status,
            runningBalance: tx.running_balance ? parseFloat(tx.running_balance) : null,
          },
          create: {
            userId: session.user.id,
            linkedBankId: bank.id,
            tellerId: tx.id,
            date: new Date(tx.date),
            amount: parseFloat(tx.amount),
            direction: tx.direction,
            description: tx.description,
            merchantName: tx.details?.counterparty?.name,
            merchantCategory: tx.details?.category,
            status: tx.status,
            type: tx.type,
            runningBalance: tx.running_balance ? parseFloat(tx.running_balance) : null,
          },
        })
        totalImported++
      }

      await prisma.linkedBank.update({
        where: { id: bank.id },
        data: { lastSynced: new Date() },
      })
    } catch (err) {
      console.error(`Sync failed for bank ${bank.id}:`, err)
    }
  }

  return NextResponse.json({ synced: banks.length, transactions: totalImported })
}
