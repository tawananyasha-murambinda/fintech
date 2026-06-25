import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [linkedBanks, assets, liabilities, investments] = await Promise.all([
    prisma.linkedBank.findMany({ where: { userId } }),
    prisma.asset.findMany({ where: { userId } }),
    prisma.liability.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
  ])

  const linkedBankAssets = linkedBanks.map(b => ({
    id: b.id,
    name: `${b.institutionName} - ${b.accountName}`,
    type: 'checking' as const,
    value: 0,
    isLinkedBank: true,
  }))

  const investmentValue = investments.reduce((s, i) => {
    if (i.shares && i.currentPrice) return s + i.shares * i.currentPrice
    return s + (i.costBasis || 0)
  }, 0)

  const totalAssets = [...assets, ...linkedBankAssets].reduce((s, a) => s + a.value, 0) + investmentValue
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0)

  return NextResponse.json({
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    assets: [...assets, ...(investmentValue > 0 ? [{ id: 'investments', name: 'Investments & Crypto', type: 'investment' as const, value: investmentValue }] : [])],
    liabilities,
  })
}
