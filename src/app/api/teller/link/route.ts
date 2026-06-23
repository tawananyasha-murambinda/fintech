import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { getTellerAccounts } from '@/lib/teller'
import { z } from 'zod'

const linkSchema = z.object({
  accessToken: z.string().min(1),
})

// POST /api/teller/link — save Teller access token after Connect flow
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const { accessToken } = parsed.data

  try {
    // Fetch account details from Teller
    const accounts = await getTellerAccounts(accessToken)

    if (!accounts.length) {
      return NextResponse.json({ error: 'No accounts found' }, { status: 400 })
    }

    const encryptedToken = encrypt(accessToken)
    const linked = []

    for (const account of accounts) {
      const existing = await prisma.linkedBank.findUnique({
        where: { tellerAccountId: account.id },
      })

      if (existing) continue

      const bank = await prisma.linkedBank.create({
        data: {
          userId: session.user.id,
          tellerAccountId: account.id,
          institutionName: account.institution.name,
          accountType: account.type,
          accountName: account.name,
          currency: account.currency,
          tellerToken: encryptedToken,
        },
      })

      linked.push(bank)
    }

    return NextResponse.json({ linked: linked.length, accounts: accounts.length })
  } catch (err) {
    console.error('Teller link error:', err)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}

// GET /api/teller/link — list linked banks
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const banks = await prisma.linkedBank.findMany({
    where: { userId: session.user.id },
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
}
