import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      direction: 'debit',
      date: { gte: threeMonthsAgo },
    },
    orderBy: { date: 'desc' },
    take: 1000,
  })

  const byMerchant: Record<string, { amounts: number[]; dates: string[]; category: string | null }> = {}
  for (const t of transactions) {
    const name = (t.merchantName || t.description).trim()
    if (!byMerchant[name]) byMerchant[name] = { amounts: [], dates: [], category: t.merchantCategory }
    byMerchant[name].amounts.push(Math.abs(t.amount))
    byMerchant[name].dates.push(t.date.toISOString())
  }

  const subscriptionKeywords = /netflix|spotify|apple music|youtube|hulu|disney|hbo|max|amazon prime|audible|kindle|chatgpt|openai|midjourney|notion|figma|adobe|canva|grammarly|duolingo|strava|peloton|fitbit|headspace|calm|crunchyroll|paramount|peacock|tidal|deezer|soundcloud|pandora|dropbox|google one|icloud|microsoft 365|patreon|onlyfans|substack|medium|new york times|washington post|wsj|the economist|skillshare|masterclass|udemy|linkedin premium|github/i

  const subscriptions: {
    name: string
    category: string | null
    monthlyAmount: number
    frequency: string
    lastCharge: string
    transactionCount: number
  }[] = []

  for (const [name, data] of Object.entries(byMerchant)) {
    const isSubscription = subscriptionKeywords.test(name) || (data.amounts.length >= 2 && new Set(data.amounts.map((a) => a.toFixed(2))).size <= 2)
    if (!isSubscription) continue

    const uniqueAmounts = [...new Set(data.amounts.map((a) => a.toFixed(2)))]
    const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length
    const monthlyAmount = data.amounts.length >= 3 ? avgAmount : avgAmount

    const sortedDates = data.dates.sort()
    const dateRange = sortedDates.length >= 2
      ? (new Date(sortedDates[sortedDates.length - 1]).getTime() - new Date(sortedDates[0]).getTime())
      : 0
    const frequency = dateRange > 0
      ? `${Math.round(dateRange / (data.amounts.length - 1) / (1000 * 60 * 60 * 24))} days`
      : 'unknown'

    subscriptions.push({
      name,
      category: data.category,
      monthlyAmount: Math.round(monthlyAmount),
      frequency,
      lastCharge: sortedDates[sortedDates.length - 1],
      transactionCount: data.amounts.length,
    })
  }

  const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyAmount, 0)

  return NextResponse.json({
    subscriptions: subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
    totalMonthly,
    count: subscriptions.length,
  })
}
