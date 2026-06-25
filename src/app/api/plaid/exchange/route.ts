import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { exchangePublicToken, getAccounts, getInstitution } from '@/lib/plaid'
import { z } from 'zod'

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

    for (const account of accounts) {
      // tellerAccountId field reused for Plaid account_id
      const existing = await prisma.linkedBank.findUnique({
        where: { tellerAccountId: account.account_id },
      })
      if (existing) continue

      const bank = await prisma.linkedBank.create({
        data: {
          userId: session.user.id,
          tellerAccountId: account.account_id, // stores Plaid account_id
          institutionName: instName,
          accountType: account.type,
          accountName: account.name,
          currency: account.balances.iso_currency_code || 'USD',
          tellerToken: encryptedToken, // stores encrypted Plaid access token
        },
      })
      linked.push(bank)
    }

    return NextResponse.json({ linked: linked.length, accounts: accounts.length })
  } catch (err: any) {
    console.error('Plaid exchange error:', err?.response?.data || err)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}
