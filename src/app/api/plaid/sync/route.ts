import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { getTransactions } from '@/lib/plaid'

// POST /api/plaid/sync — pull latest transactions for all linked accounts
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

  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  for (const bank of banks) {
    try {
      const accessToken = decrypt(bank.tellerToken)

      let hasMore = true
      let cursor: string | undefined = undefined
      let iterations = 0
      const MAX_ITERATIONS = 50

      while (hasMore && iterations < MAX_ITERATIONS) {
        iterations++
        const result = await getTransactions(accessToken, ninetyDaysAgo, today, cursor)

        for (const tx of result.added) {
          const amount = Math.abs(tx.amount)
          // Plaid: positive amount = debit (money out), negative = credit (money in)
          const direction = tx.amount > 0 ? 'debit' : 'credit'

          await prisma.transaction.upsert({
            where: { tellerId: tx.transaction_id },
            update: {
              status: tx.pending ? 'pending' : 'posted',
              merchantName: tx.merchant_name ?? tx.name,
            },
            create: {
              userId: session.user.id,
              linkedBankId: bank.id,
              tellerId: tx.transaction_id,
              date: new Date(tx.date),
              amount,
              direction,
              description: tx.name,
              merchantName: tx.merchant_name ?? tx.name,
              merchantCategory: tx.personal_finance_category?.primary
                ?? tx.category?.[0]
                ?? undefined,
              merchantCity: tx.location?.city ?? undefined,
              merchantState: tx.location?.region ?? undefined,
              merchantCountry: tx.location?.country ?? undefined,
              status: tx.pending ? 'pending' : 'posted',
              type: tx.payment_channel,
            },
          })
          totalImported++
        }

        // Handle modified transactions
        for (const tx of result.modified) {
          await prisma.transaction.updateMany({
            where: { tellerId: tx.transaction_id },
            data: {
              status: tx.pending ? 'pending' : 'posted',
              merchantName: tx.merchant_name ?? tx.name,
              amount: Math.abs(tx.amount),
            },
          })
        }

        // Handle removed transactions
        for (const tx of result.removed) {
          await prisma.transaction.deleteMany({
            where: { tellerId: tx.transaction_id },
          })
        }

        cursor = result.nextCursor
        hasMore = result.hasMore
      }

      await prisma.linkedBank.update({
        where: { id: bank.id },
        data: { lastSynced: new Date() },
      })
    } catch (err) {
      console.error(`Plaid sync failed for bank ${bank.id}:`, err)
    }
  }

  return NextResponse.json({ synced: banks.length, transactions: totalImported })
}
