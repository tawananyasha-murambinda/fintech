import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vaults = await prisma.vault.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  const rule = await prisma.roundUpRule.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { vault: true },
  })

  // Recent sweeps, so the vault balance is explainable rather than a number
  // that changes overnight with nothing to show for it.
  const [contributions, roundUpTotal] = await Promise.all([
    prisma.vaultContribution.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        transaction: { select: { merchantName: true, description: true, amount: true, date: true } },
      },
    }),
    prisma.vaultContribution.aggregate({
      where: { userId: session.user.id, source: 'roundup' },
      _count: true,
    }),
  ])

  return NextResponse.json({
    vaults,
    roundUpRule: rule,
    recentContributions: contributions.map((c) => ({
      id: c.id,
      amount: c.amount,
      source: c.source,
      createdAt: c.createdAt,
      merchant: c.transaction?.merchantName || c.transaction?.description || null,
      transactionAmount: c.transaction?.amount ?? null,
    })),
    roundUpCount: roundUpTotal._count,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, targetAmount, color } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const target = targetAmount === undefined || targetAmount === null
      ? undefined
      : typeof targetAmount === 'number' ? targetAmount : parseFloat(targetAmount)
    if (target !== undefined && (Number.isNaN(target) || target < 0)) {
      return NextResponse.json({ error: 'Target amount must be a non-negative number' }, { status: 400 })
    }

    const vault = await prisma.vault.create({
      data: { userId: session.user.id, name, targetAmount: target, color: color || 'teal' },
    })

    return NextResponse.json(vault)
  } catch (err) {
    console.error('Vault create error:', err)
    return NextResponse.json({ error: 'Failed to create vault' }, { status: 500 })
  }
}
