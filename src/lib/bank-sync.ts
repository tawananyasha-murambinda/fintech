import { prisma } from './prisma'
import { decrypt } from './encryption'
import { getTransactions } from './plaid'
import { logger } from './logger'
import { applyRules, type CategorizationRule } from './categorize'
import { canonicalCategory } from './categories'

type LinkedBankWithToken = {
  id: string
  accessToken: string
  userId: string
  [key: string]: unknown
}

// Imports/updates transactions for a single linked bank using the Plaid
// cursor. Shared by the manual sync endpoint and the Plaid webhook handler.
export async function syncLinkedBank(bank: LinkedBankWithToken): Promise<{ imported: number; error?: string }> {
  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    const accessToken = decrypt(bank.accessToken as string)

    // A user's categorisation rules were only ever applied through an explicit
    // call to /api/categorize, so rules had no effect on the transactions that
    // actually arrive — which is the entire point of a rule. They are loaded
    // once per sync and applied as rows are created.
    const rules: CategorizationRule[] = await prisma.categorizationRule.findMany({
      where: { userId: bank.userId },
      select: { matchType: true, matchValue: true, category: true, priority: true },
    })

    let hasMore = true
    let cursor: string | undefined = undefined
    let iterations = 0
    const MAX_ITERATIONS = 50
    let imported = 0

    while (hasMore && iterations < MAX_ITERATIONS) {
      iterations++
      const result = await getTransactions(accessToken, ninetyDaysAgo, today, cursor)

      for (const tx of result.added) {
        const amount = Math.abs(tx.amount)
        // Plaid: positive amount = debit (money out), negative = credit (money in)
        const direction = tx.amount > 0 ? 'debit' : 'credit'

        await prisma.transaction.upsert({
          where: { plaidTransactionId: tx.transaction_id },
          update: {
            status: tx.pending ? 'pending' : 'posted',
            merchantName: tx.merchant_name ?? tx.name,
          },
          create: {
            userId: bank.userId,
            linkedBankId: bank.id,
            plaidTransactionId: tx.transaction_id,
            date: new Date(tx.date),
            amount,
            direction,
            description: tx.name,
            merchantName: tx.merchant_name ?? tx.name,
            // A user rule beats Plaid's guess; otherwise Plaid's category is
            // normalised into the app's own vocabulary so budgets, alerts and
            // reports all agree on what "Food & Dining" means.
            merchantCategory:
              applyRules(
                tx.merchant_name ?? tx.name ?? '',
                tx.name ?? '',
                rules,
                amount
              ) ??
              canonicalCategory(
                tx.personal_finance_category?.primary ?? tx.category?.[0] ?? null
              ),
            merchantCity: tx.location?.city ?? undefined,
            merchantState: tx.location?.region ?? undefined,
            merchantCountry: tx.location?.country ?? undefined,
            status: tx.pending ? 'pending' : 'posted',
            type: tx.payment_channel,
          },
        })
        imported++
      }

      // Handle modified transactions
      for (const tx of result.modified) {
        await prisma.transaction.updateMany({
          where: { plaidTransactionId: tx.transaction_id },
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
          where: { plaidTransactionId: tx.transaction_id },
        })
      }

      cursor = result.nextCursor
      hasMore = result.hasMore
    }

    await prisma.linkedBank.update({
      where: { id: bank.id },
      data: { lastSynced: new Date() },
    })

    return { imported }
  } catch (err) {
    logger.error(`Plaid sync failed for bank ${bank.id}`, { error: err instanceof Error ? err.message : err })
    return { imported: 0, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

export async function syncAllForUser(userId: string): Promise<{ synced: number; transactions: number; failed: number }> {
  const banks = await prisma.linkedBank.findMany({ where: { userId } })
  let synced = 0
  let transactions = 0
  let failed = 0

  for (const bank of banks) {
    const result = await syncLinkedBank(bank as LinkedBankWithToken)
    if (result.error) {
      failed++
    } else {
      synced++
      transactions += result.imported
    }
  }

  return { synced, transactions, failed }
}
