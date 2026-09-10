import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { exchangePublicToken, getAccounts, getInstitution } from '@/lib/plaid'
import { z } from 'zod'
import { getUserBilling } from '@/lib/stripe'
import { logger } from '@/lib/logger'

const schema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().optional(),
  institutionName: z.string().optional(),
})

// POST /api/plaid/exchange — called after user completes Plaid Link
// Exchanges the one-time public token for a permanent access token
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { publicToken, institutionId, institutionName } = parsed.data

  try {
    // Each linked bank is a recurring Plaid cost, so the plan limit is checked
    // before the token exchange — refusing after the exchange would leave a
    // billable Plaid item behind with nothing pointing at it.
    const [billing, linkedCount] = await Promise.all([
      getUserBilling(session.user.id),
      prisma.linkedBank.count({ where: { userId: session.user.id } }),
    ])

    if (linkedCount >= billing.entitlements.linkedBanks) {
      return NextResponse.json(
        {
          error: `Your ${billing.plan} plan includes ${billing.entitlements.linkedBanks} linked ${billing.entitlements.linkedBanks === 1 ? 'bank' : 'banks'}. Upgrade to connect more.`,
          code: 'PLAN_LIMIT_REACHED',
          limit: billing.entitlements.linkedBanks,
          plan: billing.plan,
        },
        { status: 402 }
      )
    }

    // Exchange public token for access token
    const { accessToken, itemId } = await exchangePublicToken(publicToken)

    // Fetch accounts from Plaid
    const { accounts } = await getAccounts(accessToken)

    // Try to get institution name if not passed from frontend
    let instName = institutionName || 'Unknown Bank'
    if (!institutionName && institutionId) {
      try {
        const inst = await getInstitution(institutionId)
        instName = inst.name
      } catch {}
    }

    const encryptedToken = encrypt(accessToken)
    const linked: any[] = []

    let remaining = billing.entitlements.linkedBanks - linkedCount
    let skipped = 0

    for (const account of accounts) {
      const existing = await prisma.linkedBank.findUnique({
        where: { plaidAccountId: account.account_id },
      })
      if (existing) continue

      // A single Plaid Link session can return several accounts; stop at the
      // plan limit rather than importing all of them.
      if (remaining <= 0) {
        skipped++
        continue
      }
      remaining--

      const bank = await prisma.linkedBank.create({
        data: {
          userId: session.user.id,
          plaidAccountId: account.account_id,
          plaidItemId: itemId,
          institutionName: instName,
          accountType: account.type,
          accountName: account.name,
          currency: account.balances.iso_currency_code || 'USD',
          currentBalance: account.balances.current ?? null,
          availableBalance: account.balances.available ?? null,
          balanceUpdatedAt: new Date(),
          accessToken: encryptedToken,
        },
      })
      linked.push(bank)
    }

    if (skipped > 0) {
      logger.info('Bank link truncated by plan limit', {
        userId: session.user.id,
        plan: billing.plan,
        skipped,
      })
    }

    return NextResponse.json({
      linked: linked.length,
      accounts: accounts.length,
      skipped,
      ...(skipped > 0
        ? { notice: `${skipped} account${skipped > 1 ? 's were' : ' was'} not linked because your ${billing.plan} plan is at its limit.` }
        : {}),
    })
  } catch (err: any) {
    console.error('Plaid exchange error:', err?.response?.data || err)
    const code = err?.response?.data?.error_code || err?.error_code
    const plaidMessage = err?.response?.data?.error_message || err?.message
    const reason =
      code === 'INVALID_ACCESS_TOKEN'
        ? 'The bank link expired. Please try linking your bank again.'
        : code === 'ITEM_LOGIN_REQUIRED'
          ? 'Your bank requires re-authentication. Please link your bank again.'
          : code === 'INVALID_PUBLIC_TOKEN'
            ? 'The bank link was already used or is invalid. Please try again.'
            : plaidMessage
              ? `Could not link your bank: ${plaidMessage}`
              : null
    return NextResponse.json(
      { error: reason || 'Failed to link account. Please try again.' },
      { status: 500 }
    )
  }
}
