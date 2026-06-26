import Anthropic from '@anthropic-ai/sdk'
import type {
  Transaction,
  AiAnalysis,
  LocationInsight,
  MerchantAlternative,
  SpendingCategory,
  SubscriptionOverlap,
  RecurringTrend,
  WhatIfScenario,
  CashflowForecast,
  SpendingPattern,
} from '@/types'
import { findLocalAlternatives, geocodeCity } from './geocode'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface AnalysisInput {
  transactions: Transaction[]
  period: 'week' | 'month' | 'quarter'
  userLocation?: { city?: string; country?: string }
  prevPeriodCategories?: Record<string, number>
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

function cleanCategory(cat?: string | null) {
  return (cat || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function aggregateDebits(transactions: Transaction[]) {
  const debits = transactions.filter((t) => t.direction === 'debit')
  const credits = transactions.filter((t) => t.direction === 'credit')

  const totalExpenses = debits.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = credits.reduce((s, t) => s + Math.abs(t.amount), 0)

  const byCategory: Record<string, { total: number; count: number }> = {}
  for (const t of debits) {
    const cat = cleanCategory(t.merchantCategory)
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 }
    byCategory[cat].total += Math.abs(t.amount)
    byCategory[cat].count++
  }

  const byMerchant: Record<string, { total: number; count: number; category: string; city?: string; country?: string }> = {}
  for (const t of debits) {
    const name = t.merchantName || t.description
    if (!byMerchant[name]) {
      byMerchant[name] = {
        total: 0,
        count: 0,
        category: cleanCategory(t.merchantCategory),
        city: t.merchantCity || undefined,
        country: t.merchantCountry || undefined,
      }
    }
    byMerchant[name].total += Math.abs(t.amount)
    byMerchant[name].count++
  }

  const byLocation: Record<string, { total: number; categories: Record<string, number> }> = {}
  for (const t of debits) {
    const city = t.merchantCity
    const country = t.merchantCountry
    if (!city && !country) continue
    const key = `${city || 'Unknown'}|${country || 'Unknown'}`
    if (!byLocation[key]) byLocation[key] = { total: 0, categories: {} }
    byLocation[key].total += Math.abs(t.amount)
    const cat = cleanCategory(t.merchantCategory)
    byLocation[key].categories[cat] = (byLocation[key].categories[cat] || 0) + Math.abs(t.amount)
  }

  return { debits, credits, totalExpenses, totalIncome, byCategory, byMerchant, byLocation }
}

function buildCategoryBreakdown(
  byCategory: Record<string, { total: number; count: number }>,
  totalExpenses: number,
  prevPeriodCategories?: Record<string, number>
): SpendingCategory[] {
  return Object.entries(byCategory)
    .map(([category, data]) => {
      const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      const prev = prevPeriodCategories?.[category] || 0
      const trend = prev > 0 ? ((data.total - prev) / prev) * 100 : 0
      return { category, total: data.total, count: data.count, percentage, trend, transactions: [] }
    })
    .sort((a, b) => b.total - a.total)
}

function buildLocationInsights(byLocation: Record<string, { total: number; categories: Record<string, number> }>): LocationInsight[] {
  return Object.entries(byLocation)
    .map(([key, data]) => {
      const [city, country] = key.split('|')
      const displayCity = city === 'Unknown' ? (country === 'Unknown' ? 'Unknown location' : country) : city
      const displayCountry = country === 'Unknown' ? '' : country
      const topCategories = Object.entries(data.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat)
      return {
        city: displayCity,
        country: displayCountry,
        totalSpent: data.total,
        topCategories,
        suggestions: generateLocationSuggestions(displayCity, topCategories, data.total),
      }
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 6)
}

function generateLocationSuggestions(locationName: string, topCategories: string[], totalSpent: number): string[] {
  const suggestions: string[] = []
  const top = topCategories[0]?.toLowerCase() || ''
  if (top.includes('Food') || top.includes('Drink') || top.includes('Dining')) {
    suggestions.push(`You spend heavily on dining in ${locationName}. Try meal prepping one extra day per week.`)
  }
  if (top.includes('Transport') || top.includes('Travel')) {
    suggestions.push(`Transportation is a major expense here. Consider public transit, carpooling, or biking.`)
  }
  if (top.includes('Shopping')) {
    suggestions.push(`Retail spending is high in ${locationName}. Set a 24-hour rule before non-essential purchases.`)
  }
  if (top.includes('Entertainment')) {
    suggestions.push(`Look for free local events, museum discount days, or subscription bundles in ${locationName}.`)
  }
  if (totalSpent > 2000) {
    suggestions.push(`This location accounts for significant spending. Track it weekly to catch budget drift.`)
  }
  if (suggestions.length === 0) {
    suggestions.push(`Review recurring expenses in ${locationName} for unused subscriptions or negotiable bills.`)
  }
  return suggestions.slice(0, 3)
}

async function buildMerchantAlternatives(
  byMerchant: Record<string, { total: number; count: number; category: string; city?: string; country?: string }>
): Promise<MerchantAlternative[]> {
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)

  const results: MerchantAlternative[] = []
  for (const [merchantName, data] of topMerchants) {
    let alternatives: MerchantAlternative['alternatives'] = []

    if (data.city) {
      try {
        alternatives = await findLocalAlternatives(data.city, data.country, data.category, merchantName)
      } catch {}
    }

    if (alternatives.length === 0) {
      alternatives = generateGenericAlternatives(merchantName, data.category)
    }

    results.push({
      merchantName,
      category: data.category,
      totalSpent: data.total,
      visitCount: data.count,
      avgTransaction: data.count > 0 ? data.total / data.count : 0,
      alternatives,
    })
  }

  return results
}

function generateGenericAlternatives(merchantName: string, category: string): MerchantAlternative['alternatives'] {
  const cat = category.toLowerCase()
  if (cat.includes('food') || cat.includes('drink') || cat.includes('dining') || cat.includes('restaurant')) {
    return [
      { name: 'Grocery stores / meal kits', estimatedSavings: 80, reason: 'Cooking at home typically cuts food costs by 40–60%.' },
      { name: 'Local lunch specials', estimatedSavings: 40, reason: 'Many restaurants offer weekday lunch menus at dinner portions for less.' },
    ]
  }
  if (cat.includes('coffee')) {
    return [
      { name: 'Home brewing setup', estimatedSavings: 55, reason: 'A coffee maker and beans pay for themselves quickly.' },
      { name: 'Office or loyalty rewards drinks', estimatedSavings: 20, reason: 'Use rewards points and refillable cups.' },
    ]
  }
  if (cat.includes('transport') || cat.includes('gas') || cat.includes('rideshare')) {
    return [
      { name: 'Public transit passes', estimatedSavings: 70, reason: 'Monthly passes are usually cheaper than per-ride fares.' },
      { name: 'Carpool / bike / walk', estimatedSavings: 40, reason: 'Even a few days a week saves fuel and parking.' },
    ]
  }
  if (cat.includes('entertainment') || cat.includes('streaming')) {
    return [
      { name: 'Annual subscription plans', estimatedSavings: 25, reason: 'Yearly billing often offers 15–20% discounts.' },
      { name: 'Ad-supported tiers', estimatedSavings: 20, reason: 'Many services offer free or cheaper ad-supported plans.' },
    ]
  }
  if (cat.includes('shopping') || cat.includes('retail')) {
    return [
      { name: 'Cashback / coupon apps', estimatedSavings: 45, reason: 'Stack cashback and promo codes on planned purchases.' },
      { name: 'Buy used / refurbished', estimatedSavings: 70, reason: 'Secondhand marketplaces often have like-new items for less.' },
    ]
  }
  if (cat.includes('health') || cat.includes('pharmacy') || cat.includes('fitness')) {
    return [
      { name: 'Generic brands / in-network pharmacies', estimatedSavings: 35, reason: 'Generics and in-network pharmacies reduce out-of-pocket costs.' },
      { name: 'Community wellness programs', estimatedSavings: 45, reason: 'Many employers and communities subsidize gym memberships.' },
    ]
  }
  return [
    { name: 'Generic or store-brand alternatives', estimatedSavings: 35, reason: 'Store brands often match quality at a lower price.' },
    { name: 'Subscription / loyalty discounts', estimatedSavings: 20, reason: 'Recurring purchases may qualify for bulk or loyalty pricing.' },
  ]
}

function buildSavingsOpportunities(breakdown: SpendingCategory[], merchants: MerchantAlternative[]) {
  const opportunities: AiAnalysis['savingsOpportunities'] = []

  const topCategory = breakdown[0]
  if (topCategory && topCategory.total > 100) {
    opportunities.push({
      title: `Reduce ${topCategory.category} spending`,
      description: `Your top category is ${topCategory.category} at ${topCategory.percentage.toFixed(0)}% of expenses. A 20% reduction here would free up meaningful cash.`,
      estimatedMonthlySavings: Math.round(topCategory.total * 0.2),
      difficulty: 'medium',
    })
  }

  const topMerchant = merchants[0]
  if (topMerchant && topMerchant.totalSpent > 100) {
    opportunities.push({
      title: `Cut back at ${topMerchant.merchantName}`,
      description: `You visited ${topMerchant.merchantName} ${topMerchant.visitCount} times and spent ${topMerchant.totalSpent.toFixed(0)}. Reducing frequency by 30% adds up fast.`,
      estimatedMonthlySavings: Math.round(topMerchant.totalSpent * 0.3),
      difficulty: 'easy',
    })
  }

  const discretionaryCats = breakdown.filter((c) => /dining|entertainment|shopping|coffee|travel/i.test(c.category))
  const discretionaryTotal = discretionaryCats.reduce((s, c) => s + c.total, 0)
  if (discretionaryTotal > 200) {
    opportunities.push({
      title: 'Implement a discretionary spending cap',
      description: 'Set a weekly cap for dining, entertainment, and shopping. Pause non-essential purchases for 24 hours.',
      estimatedMonthlySavings: Math.round(discretionaryTotal * 0.15),
      difficulty: 'easy',
    })
  }

  const recurringCats = breakdown.filter((c) => /subscription|utilities|insurance|gym/i.test(c.category))
  if (recurringCats.length > 0) {
    opportunities.push({
      title: 'Audit recurring bills',
      description: 'Review subscriptions, utilities, and insurance for unused services or better rates.',
      estimatedMonthlySavings: Math.round(recurringCats.reduce((s, c) => s + c.total, 0) * 0.1),
      difficulty: 'hard',
    })
  }

  return opportunities.slice(0, 5)
}

function detectSubscriptionOverlaps(merchants: Record<string, { total: number; count: number; category: string }>): SubscriptionOverlap[] {
  const subscriptionKeywords = /netflix|spotify|apple music|youtube premium|hulu|disney|hbo|max|amazon prime|audible|kindle|chatgpt|openai|midjourney|notion|figma|adobe|canva|grammarly|duolingo|strava|peloton|fitbit|headspace|calm|nym|rakuten|crunchyroll|paramount|peacock|tidal|deezer|soundcloud|pandora/i

  const subs = Object.entries(merchants)
    .filter(([name]) => subscriptionKeywords.test(name))
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)

  const entertainment = subs.filter((s) => /netflix|hulu|disney|hbo|max|paramount|peacock|crunchyroll|youtube premium|tidal|deezer|spotify|apple music|soundcloud|pandora/i.test(s.name))
  const productivity = subs.filter((s) => /notion|figma|adobe|canva|grammarly|chatgpt|openai|midjourney/i.test(s.name))
  const wellness = subs.filter((s) => /headspace|calm|strava|peloton|fitbit/i.test(s.name))

  const overlaps: SubscriptionOverlap[] = []

  if (entertainment.length >= 2) {
    const total = entertainment.reduce((s, x) => s + x.total, 0)
    overlaps.push({
      category: 'Entertainment streaming',
      merchants: entertainment.map((x) => ({ name: x.name, monthlyEstimate: x.count > 0 ? x.total / x.count : x.total })),
      totalMonthly: total,
      suggestion: 'You may be paying for multiple streaming services. Consider rotating one per month or using a family plan.',
    })
  }

  if (productivity.length >= 2) {
    const total = productivity.reduce((s, x) => s + x.total, 0)
    overlaps.push({
      category: 'Productivity tools',
      merchants: productivity.map((x) => ({ name: x.name, monthlyEstimate: x.count > 0 ? x.total / x.count : x.total })),
      totalMonthly: total,
      suggestion: 'Several productivity subscriptions overlap. Cancel redundancies or look for bundled suites.',
    })
  }

  if (wellness.length >= 2) {
    const total = wellness.reduce((s, x) => s + x.total, 0)
    overlaps.push({
      category: 'Wellness apps',
      merchants: wellness.map((x) => ({ name: x.name, monthlyEstimate: x.count > 0 ? x.total / x.count : x.total })),
      totalMonthly: total,
      suggestion: 'Wellness subscriptions can stack up. Pick the one you use most and pause the others.',
    })
  }

  return overlaps
}

function detectRecurringTrends(transactions: Transaction[]): RecurringTrend[] {
  const byMerchant: Record<string, number[]> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const name = t.merchantName || t.description
    if (!byMerchant[name]) byMerchant[name] = []
    byMerchant[name].push(Math.abs(t.amount))
  }

  const trends: RecurringTrend[] = []
  for (const [merchantName, amounts] of Object.entries(byMerchant)) {
    if (amounts.length < 3) continue
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2))
    const secondHalf = amounts.slice(Math.floor(amounts.length / 2))
    const firstAvg = firstHalf.reduce((s, a) => s + a, 0) / firstHalf.length || 1
    const secondAvg = secondHalf.reduce((s, a) => s + a, 0) / secondHalf.length
    const trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100

    if (Math.abs(trendPercent) > 5) {
      trends.push({
        merchantName,
        category: cleanCategory(transactions.find((t) => (t.merchantName || t.description) === merchantName)?.merchantCategory),
        avgAmount: avg,
        transactionCount: amounts.length,
        trendPercent,
        suggestion: trendPercent > 0
          ? `Costs at ${merchantName} are rising. Review your plan or usage.`
          : `Costs at ${merchantName} are falling — good trend.`,
      })
    }
  }

  return trends.sort((a, b) => Math.abs(b.trendPercent) - Math.abs(a.trendPercent)).slice(0, 5)
}

function buildWhatIfScenarios(breakdown: SpendingCategory[], totalIncome: number, totalExpenses: number): WhatIfScenario[] {
  const scenarios: WhatIfScenario[] = []

  const dining = breakdown.find((c) => /dining|food/i.test(c.category))
  if (dining) {
    scenarios.push({
      label: 'Cook one extra meal per week',
      description: 'Reduce dining out by just one visit per week.',
      monthlyImpact: Math.round(dining.total * 0.12),
      yearlyImpact: Math.round(dining.total * 0.12 * 12),
      difficulty: 'easy',
    })
  }

  const coffee = breakdown.find((c) => /coffee/i.test(c.category))
  if (coffee) {
    scenarios.push({
      label: 'Brew coffee at home 3 days/week',
      description: 'Replace half your coffee-shop visits with home brewing.',
      monthlyImpact: Math.round(coffee.total * 0.5),
      yearlyImpact: Math.round(coffee.total * 0.5 * 12),
      difficulty: 'easy',
    })
  }

  const transport = breakdown.find((c) => /transport|gas/i.test(c.category))
  if (transport) {
    scenarios.push({
      label: 'Use public transit one day per week',
      description: 'Swap one driving day per week for transit, bike, or walking.',
      monthlyImpact: Math.round(transport.total * 0.08),
      yearlyImpact: Math.round(transport.total * 0.08 * 12),
      difficulty: 'medium',
    })
  }

  const entertainment = breakdown.find((c) => /entertainment/i.test(c.category))
  if (entertainment) {
    scenarios.push({
      label: 'Cancel one unused subscription',
      description: 'Drop the streaming or app subscription you use least.',
      monthlyImpact: Math.round(entertainment.total * 0.2),
      yearlyImpact: Math.round(entertainment.total * 0.2 * 12),
      difficulty: 'easy',
    })
  }

  const shopping = breakdown.find((c) => /shopping/i.test(c.category))
  if (shopping) {
    scenarios.push({
      label: '24-hour purchase rule',
      description: 'Wait a day before non-essential purchases to curb impulse buys.',
      monthlyImpact: Math.round(shopping.total * 0.15),
      yearlyImpact: Math.round(shopping.total * 0.15 * 12),
      difficulty: 'medium',
    })
  }

  scenarios.push({
    label: 'Save 10% of all income',
    description: 'Automatically transfer 10% of income to savings before spending.',
    monthlyImpact: Math.round(totalIncome * 0.1),
    yearlyImpact: Math.round(totalIncome * 0.1 * 12),
    difficulty: 'hard',
  })

  return scenarios.slice(0, 6)
}

function buildCashflowForecast(transactions: Transaction[]): CashflowForecast[] {
  const debits = transactions.filter((t) => t.direction === 'debit')
  const credits = transactions.filter((t) => t.direction === 'credit')

  const avgDailyExpense = debits.length > 0 ? debits.reduce((s, t) => s + Math.abs(t.amount), 0) / debits.length : 0
  const avgDailyIncome = credits.length > 0 ? credits.reduce((s, t) => s + Math.abs(t.amount), 0) / credits.length : 0

  const lastDate = transactions.length > 0 ? new Date(transactions[0].date) : new Date()
  let balance = 0

  const forecast: CashflowForecast[] = []
  for (let i = 1; i <= 14; i++) {
    const date = new Date(lastDate)
    date.setDate(date.getDate() + i)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const expectedExpenses = isWeekend ? avgDailyExpense * 1.2 : avgDailyExpense
    const expectedIncome = i === 1 || i === 15 ? avgDailyIncome * 3 : avgDailyIncome * 0.3
    balance += expectedIncome - expectedExpenses
    forecast.push({
      date: date.toISOString().split('T')[0],
      predictedBalance: Math.round(balance),
      expectedIncome: Math.round(expectedIncome),
      expectedExpenses: Math.round(expectedExpenses),
    })
  }

  return forecast
}

function buildSpendingPatterns(transactions: Transaction[]): SpendingPattern[] {
  const debits = transactions.filter((t) => t.direction === 'debit')
  const patterns: SpendingPattern[] = []

  // Weekend vs weekday
  const weekend = debits.filter((t) => {
    const d = new Date(t.date)
    return d.getDay() === 0 || d.getDay() === 6
  })
  const weekday = debits.filter((t) => !weekend.includes(t))
  const weekendAvg = weekend.length > 0 ? weekend.reduce((s, t) => s + Math.abs(t.amount), 0) / weekend.length : 0
  const weekdayAvg = weekday.length > 0 ? weekday.reduce((s, t) => s + Math.abs(t.amount), 0) / weekday.length : 0

  if (weekendAvg > weekdayAvg * 1.3) {
    patterns.push({
      title: 'Weekend spender',
      description: 'Your average weekend spend is higher than weekdays.',
      value: `${((weekendAvg / Math.max(weekdayAvg, 1)) * 100 - 100).toFixed(0)}% higher`,
      insight: 'Try planning weekend activities in advance to avoid impulse spending.',
    })
  }

  // Morning vs evening
  // Note: transactions don't have time, so skip time-of-day unless available

  // Large transaction frequency
  const largeTx = debits.filter((t) => Math.abs(t.amount) > 200)
  if (largeTx.length > 0) {
    patterns.push({
      title: 'Big-ticket frequency',
      description: 'Number of transactions over $200 in this period.',
      value: `${largeTx.length}`,
      insight: 'Large purchases have outsized impact. Schedule them around income dates.',
    })
  }

  // Merchant concentration
  const byMerchant: Record<string, number> = {}
  for (const t of debits) {
    const name = t.merchantName || t.description
    byMerchant[name] = (byMerchant[name] || 0) + Math.abs(t.amount)
  }
  const topMerchant = Object.entries(byMerchant).sort((a, b) => b[1] - a[1])[0]
  if (topMerchant) {
    patterns.push({
      title: 'Top merchant loyalty',
      description: 'Your highest-spend merchant.',
      value: topMerchant[0],
      insight: 'See if this merchant offers a loyalty program or bulk discount.',
    })
  }

  return patterns
}

function buildMerchantConcentrationRisk(merchants: Record<string, { total: number }>, totalExpenses: number) {
  return Object.entries(merchants)
    .map(([merchantName, data]) => {
      const percent = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      const riskLevel: 'high' | 'medium' | 'low' = percent > 25 ? 'high' : percent > 10 ? 'medium' : 'low'
      return {
        merchantName,
        percentOfExpenses: percent,
        riskLevel,
      }
    })
    .sort((a, b) => b.percentOfExpenses - a.percentOfExpenses)
    .slice(0, 5)
}

function detectHiddenRecurringCharges(transactions: Transaction[]) {
  const byMerchant: Record<string, { amounts: number[]; dates: string[] }> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const name = t.merchantName || t.description
    if (!byMerchant[name]) byMerchant[name] = { amounts: [], dates: [] }
    byMerchant[name].amounts.push(Math.abs(t.amount))
    byMerchant[name].dates.push(t.date)
  }

  const recurring: AiAnalysis['hiddenRecurringCharges'] = []
  for (const [merchantName, data] of Object.entries(byMerchant)) {
    if (data.dates.length < 2) continue
    const amounts = data.amounts
    const uniqueAmounts = new Set(amounts.map((a) => a.toFixed(2)))
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    if (data.dates.length >= 3 && uniqueAmounts.size <= 2) {
      recurring.push({
        merchantName,
        amount: Math.round(avg),
        frequency: data.dates.length >= 6 ? 'likely monthly' : 'recurring',
        detectedAt: data.dates[0],
      })
    }
  }

  return recurring.slice(0, 6)
}

function calculateSustainabilityScore(transactions: Transaction[]): number {
  const debits = transactions.filter((t) => t.direction === 'debit')
  if (debits.length === 0) return 50

  const highCarbonCats = /gas|fuel|airline|travel|fast_food/i
  const lowCarbonCats = /groceries|public_transport|cycle|fitness|health/i

  const highCarbon = debits.filter((t) => highCarbonCats.test(t.merchantCategory || '')).reduce((s, t) => s + Math.abs(t.amount), 0)
  const lowCarbon = debits.filter((t) => lowCarbonCats.test(t.merchantCategory || '')).reduce((s, t) => s + Math.abs(t.amount), 0)
  const total = debits.reduce((s, t) => s + Math.abs(t.amount), 0)

  if (total === 0) return 50
  const ratio = lowCarbon / (highCarbon + 1)
  return Math.min(100, Math.round(40 + ratio * 30))
}

function determineCashflowHealth(income: number, expenses: number): AiAnalysis['cashflowHealth'] {
  if (income === 0) return expenses > 100 ? 'concerning' : 'good'
  const ratio = (income - expenses) / income
  if (ratio >= 0.2) return 'excellent'
  if (ratio >= 0.05) return 'good'
  if (ratio >= 0) return 'fair'
  return 'concerning'
}

function sanitizeAiResponse(raw: string): Partial<AiAnalysis> {
  const cleaned = raw
    .replace(/```json\s?|```\s?/gi, '')
    .replace(/^[^{]*/g, '')
    .replace(/[^}]*$/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return {}
  }
}

export async function analyzeSpending(input: AnalysisInput): Promise<AiAnalysis> {
  const { transactions, period, userLocation, prevPeriodCategories } = input

  const { debits, totalExpenses, totalIncome, byCategory, byMerchant, byLocation } = aggregateDebits(transactions)

  const categoryBreakdown = buildCategoryBreakdown(byCategory, totalExpenses, prevPeriodCategories)
  const locationInsights = buildLocationInsights(byLocation)
  const merchantAlternatives = await buildMerchantAlternatives(byMerchant)
  const savingsOpportunities = buildSavingsOpportunities(categoryBreakdown, merchantAlternatives)
  const cashflowHealth = determineCashflowHealth(totalIncome, totalExpenses)
  const monthlyBudgetSuggestion = Math.max(0, Math.round(totalExpenses * 0.95))

  const subscriptionOverlaps = detectSubscriptionOverlaps(byMerchant)
  const recurringTrends = detectRecurringTrends(transactions)
  const whatIfScenarios = buildWhatIfScenarios(categoryBreakdown, totalIncome, totalExpenses)
  const cashflowForecast = buildCashflowForecast(transactions)
  const spendingPatterns = buildSpendingPatterns(transactions)
  const merchantConcentrationRisk = buildMerchantConcentrationRisk(byMerchant, totalExpenses)
  const hiddenRecurringCharges = detectHiddenRecurringCharges(transactions)
  const sustainabilityScore = calculateSustainabilityScore(transactions)

  // Build AI prompt for real-world local alternatives and narrative
  const topLocations = locationInsights.slice(0, 3)
  const prompt = `You are a hyper-local personal finance analyst. Given this spending data, write a 2-3 sentence summary and one actionable top insight. Be specific and reference real spending locations when relevant.

Period: ${period}
Total income: ${totalIncome.toFixed(2)}
Total expenses: ${totalExpenses.toFixed(2)}
Transaction count: ${transactions.length}
User location hint: ${userLocation ? JSON.stringify(userLocation) : 'not provided'}

Top spending categories:
${categoryBreakdown.slice(0, 6).map((c) => `- ${c.category}: ${c.total.toFixed(2)} (${c.percentage.toFixed(0)}%)`).join('\n')}

Top spending locations:
${topLocations.map((l) => `- ${l.city}${l.country ? `, ${l.country}` : ''}: ${l.totalSpent.toFixed(2)}`).join('\n') || 'No location data'}

Return ONLY a JSON object with this exact shape and no other text:
{
  "summary": "2-3 sentence plain English overview",
  "topInsight": "single most actionable insight in one sentence"
}`

  let summary = 'Your spending has been analyzed based on the selected period.'
  let topInsight = 'Review your top categories and locations to find the best opportunities to save.'

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = sanitizeAiResponse(text)
    if (parsed.summary) summary = parsed.summary
    if (parsed.topInsight) topInsight = parsed.topInsight
  } catch (err) {
    console.error('AI narrative failed, using fallback:', err)
  }

  return {
    summary,
    topInsight,
    categoryBreakdown,
    merchantAlternatives,
    locationInsights,
    savingsOpportunities,
    cashflowHealth,
    monthlyBudgetSuggestion,
    subscriptionOverlaps,
    recurringTrends,
    whatIfScenarios,
    cashflowForecast,
    spendingPatterns,
    merchantConcentrationRisk,
    hiddenRecurringCharges,
    sustainabilityScore,
  }
}

function chatLocalFallback(userMessage: string, transactions: Transaction[], conversationHistory: { role: string; content: string }[]): string {
  const msg = userMessage.toLowerCase().trim()

  // ── BUILD COMPREHENSIVE DATA PROFILE ──────────────────────────

  const incomeTotal = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenseTotal = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const netCashflow = incomeTotal - expenseTotal
  const txCount = transactions.length

  // Category breakdown
  const catMap: Record<string, { total: number; count: number }> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const cat = cleanCategory(t.merchantCategory)
    if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 }
    catMap[cat].total += Math.abs(t.amount)
    catMap[cat].count++
  }
  const categories = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total)

  // Merchant breakdown
  const merchantMap: Record<string, { total: number; count: number; category: string }> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const name = t.merchantName || t.description
    if (!merchantMap[name]) merchantMap[name] = { total: 0, count: 0, category: cleanCategory(t.merchantCategory) }
    merchantMap[name].total += Math.abs(t.amount)
    merchantMap[name].count++
  }
  const merchants = Object.entries(merchantMap).sort((a, b) => b[1].total - a[1].total)

  // Time-based analysis (this month vs last month)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const thisMonthTx = transactions.filter(t => t.date >= thisMonthStart)
  const lastMonthTx = transactions.filter(t => t.date >= lastMonthStart && t.date < thisMonthStart)

  const thisMonthExpenses = thisMonthTx.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const lastMonthExpenses = lastMonthTx.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const thisMonthIncome = thisMonthTx.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)

  // Date range parser
  function getTransactionsInRange(msg: string): { filtered: Transaction[]; label: string } {
    let days = 0
    let label = ''

    const monthMatch = msg.match(/(\d+)\s*months?/i)
    if (monthMatch) {
      days = parseInt(monthMatch[1]) * 30
      label = `the last ${monthMatch[1]} months`
    }

    if (days === 0) {
      const weekMatch = msg.match(/(\d+)\s*weeks?/i)
      if (weekMatch) {
        days = parseInt(weekMatch[1]) * 7
        label = `the last ${weekMatch[1]} weeks`
      }
    }

    if (days === 0) {
      if (/\b(last|past)\s+month\b/i.test(msg) || /\blast\s+30\b/i.test(msg)) {
        days = 30
        label = 'last month'
      } else if (/\b(this|current)\s+month\b/i.test(msg)) {
        days = now.getDate()
        label = 'this month'
      } else if (/\b(last|past)\s+quarter\b/i.test(msg) || /\b(last|past)\s+3\s*months\b/i.test(msg)) {
        days = 90
        label = 'the last quarter'
      } else if (/\b(this|current)\s+year\b/i.test(msg)) {
        days = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000)
        label = 'this year'
      } else if (/\b(last|past)\s+year\b/i.test(msg) || /\blast\s+12\s*months\b/i.test(msg)) {
        days = 365
        label = 'the last year'
      }
    }

    if (days > 0) {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString()
      return {
        filtered: transactions.filter(t => t.date >= cutoff),
        label,
      }
    }

    return { filtered: transactions, label: 'all time' }
  }

  // ── INTENT DETECTION ──────────────────────────────────────────

  // Check for time period mentions
  const hasTimeRange = /\b(last|past|this|current)\s+(month|quarter|year|week|30|90|365)\b|\b\d+\s*(months?|weeks?|days?)\b/i.test(msg)
  const timeData = hasTimeRange ? getTransactionsInRange(msg) : null
  const periodLabel = timeData?.label || ''
  const periodTx = timeData?.filtered || []
  const periodExpenses = periodTx.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const periodIncome = periodTx.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)

  // Category matching
  const mentionedCategories: string[] = []
  for (const [cat] of categories) {
    const catBits = cat.toLowerCase().split(/\s+/)
    if (catBits.some(bit => bit.length > 3 && msg.includes(bit))) {
      mentionedCategories.push(cat)
    }
  }
  // Broad food keywords
  if (/food|dining|eat|restaurant|groceries|coffee|drink|lunch|dinner|breakfast|meal|snack|takeout|delivery|pizza|sushi|burger/i.test(msg)) {
    const foodCats = categories.filter(([cat]) => /food|dining|groceries|coffee|restaurant|drink|eating/i.test(cat))
    for (const [cat] of foodCats) {
      if (!mentionedCategories.includes(cat)) mentionedCategories.push(cat)
    }
  }
  // Broad transport keywords
  if (/transport|gas|fuel|uber|lyft|rideshare|train|bus|subway|metro|parking|toll/i.test(msg)) {
    const transportCats = categories.filter(([cat]) => /transport|gas|fuel|auto|vehicle|travel/i.test(cat))
    for (const [cat] of transportCats) {
      if (!mentionedCategories.includes(cat)) mentionedCategories.push(cat)
    }
  }
  // Broad shopping keywords
  if (/shop|retail|store|amazon|online.*buy|purchase|clothes|electronics/i.test(msg)) {
    const shopCats = categories.filter(([cat]) => /shop|retail|merchandise|apparel|electroni/i.test(cat))
    for (const [cat] of shopCats) {
      if (!mentionedCategories.includes(cat)) mentionedCategories.push(cat)
    }
  }
  // Broad entertainment keywords
  if (/entertain|stream|movie|game|concert|netflix|hulu|spotify|subscription|subs/i.test(msg)) {
    const entCats = categories.filter(([cat]) => /entertain|stream|subscription|media|recreation/i.test(cat))
    for (const [cat] of entCats) {
      if (!mentionedCategories.includes(cat)) mentionedCategories.push(cat)
    }
  }

  // Merchant matching
  const mentionedMerchants: string[] = []
  for (const [name] of merchants) {
    if (msg.includes(name.toLowerCase())) {
      mentionedMerchants.push(name)
    }
  }
  // Also check if they mention a merchant name that's part of a longer description
  const msgWords = msg.split(/\s+/)
  for (const [name] of merchants) {
    const nameParts = name.toLowerCase().split(/\s+/)
    if (nameParts.length === 1 && msgWords.includes(nameParts[0])) {
      if (!mentionedMerchants.includes(name)) mentionedMerchants.push(name)
    }
  }

  // Intent classifiers
  const greeting = /\b(hi|hello|hey|greetings|what's up|sup|howdy|good\s+(morning|afternoon|evening))\b/.test(msg) && msg.length < 50
  const thanks = /\b(thanks|thank you|thx|ty|appreciate|cheers)\b/.test(msg) && msg.length < 40
  const isAskingAffordability = /(can|should|would)\s+i\s+(afford|buy|purchase|spend)|afford\s+a?\s*\$?\d+k?|\$\d+\.?\d*\s*(purchase|buy|spend|cost)|is\s+it\s+(worth|affordable)/i.test(msg)
  const isAskingSavings = /(save|cut|reduce|cheaper|decrease|less|frugal|economize|minimize|lower\s+(spend|cost|expense))/i.test(msg)
  const isAskingSummary = /^(total|overview|summary|overall|all|finances?|money|report)\b|(how\s+much\s+(have|did)\s+i\s+(spend|spent))|(what('s| is)\s+my\s+(total|spending|financ))/i.test(msg) && !isAskingSavings && !isAskingAffordability && mentionedCategories.length === 0
  const isAskingIncome = /(income|earn|salary|pay|wage|deposit|received|got\s+paid)/i.test(msg)
  const isAskingMerchants = /^(where|who)\b|(merchant|store|shop|retailer|business|vendor|company)/i.test(msg) && mentionedCategories.length === 0
  const isAskingTrend = /(trend|pattern|compare|change|increase|decrease|vs|versus|more\s+than|less\s+than|growing|shrinking)/i.test(msg)
  const isAskingBudget = /(budget|limit|capped|allowance|capping)/i.test(msg)
  const isAskingLargest = /(biggest|largest|top|highest|most|maximum|max)/i.test(msg) && !isAskingSavings && !isAskingSummary
  const isAskingWeekly = /\b(week|weekly|this\s+week|last\s+week)\b/i.test(msg)
  const isAskingMonthly = /\b(month|monthly|this\s+month)\b/i.test(msg) && !hasTimeRange

  // ── RESPONSE GENERATION ───────────────────────────────────────

  // Empty data
  if (txCount === 0) {
    return "I don't have any transaction data to analyze yet. Link a bank account or add manual transactions from the sidebar."
  }

  // Greeting
  if (greeting) {
    const topCatName = categories[0]?.[0] || 'uncategorized'
    const topMerchName = merchants[0]?.[0] || 'unknown'
    return `Hi! I've analyzed your finances across ${txCount} transactions. You've earned $${incomeTotal.toFixed(2)} and spent $${expenseTotal.toFixed(2)}${categories[0] ? `. Your biggest category is ${topCatName} ($${categories[0][1].total.toFixed(2)}), and your top merchant is ${topMerchName} ($${merchants[0][1].total.toFixed(2)})` : ''}. What would you like to know about your spending?`
  }

  // Thanks
  if (thanks) {
    return "You're welcome! I'm here to help with any financial questions — just ask."
  }

  // ── CATEGORY-SPECIFIC QUESTIONS ──
  if (mentionedCategories.length > 0) {
    const useTx = timeData?.filtered || transactions
    const useExpenses = useTx.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

    const catData = mentionedCategories.map(name => {
      const d = catMap[name] || { total: 0, count: 0 }
      const periodTotal = useTx
        .filter(t => t.direction === 'debit' && cleanCategory(t.merchantCategory) === name)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      return { name, total: d.total, periodTotal, count: d.count, pct: useExpenses > 0 ? (periodTotal / useExpenses) * 100 : 0 }
    }).sort((a, b) => b.periodTotal - a.periodTotal)

    const totalPeriod = catData.reduce((s, c) => s + c.periodTotal, 0)
    const totalAll = catData.reduce((s, c) => s + c.total, 0)

    // Find specific merchants in these categories for the period
    const relatedMerchants = merchants
      .filter(([_, d]) => catData.some(c => c.name === d.category))
      .slice(0, 3)

    const timePhrase = periodLabel || 'all time'
    const details = catData.map(c =>
      `• ${c.name}: $${c.periodTotal.toFixed(2)}${c.pct > 0 ? ` (${c.pct.toFixed(1)}% of ${timePhrase} expenses, ${useTx.filter(t => t.direction === 'debit' && cleanCategory(t.merchantCategory) === c.name).length} transactions)` : ''}`
    ).join('\n')

    const merchantLine = relatedMerchants.length > 0
      ? `\n\nTop merchants: ${relatedMerchants.map(([n, d]) => `${n} ($${d.total.toFixed(2)} total)`).join(', ')}`
      : ''

    // MoM comparison for this category
    const lastMonthCatSpend = lastMonthTx
      .filter(t => t.direction === 'debit' && catData.some(c => cleanCategory(t.merchantCategory) === c.name))
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    const thisMonthCatSpend = thisMonthTx
      .filter(t => t.direction === 'debit' && catData.some(c => cleanCategory(t.merchantCategory) === c.name))
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    let trendLine = ''
    if (lastMonthCatSpend > 0) {
      const change = ((thisMonthCatSpend - lastMonthCatSpend) / lastMonthCatSpend) * 100
      const arrow = change > 0 ? '↑' : '↓'
      trendLine = `\n\nTrend: ${arrow} ${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} this month vs last ($${lastMonthCatSpend.toFixed(2)} → $${thisMonthCatSpend.toFixed(2)})`
    }

    return `You've spent $${totalPeriod.toFixed(2)} on ${mentionedCategories.length === 1 ? mentionedCategories[0] : 'these categories'} in ${timePhrase}:\n${details}${merchantLine}${trendLine}`
  }

  // ── MERCHANT-SPECIFIC QUESTIONS ──
  if (mentionedMerchants.length > 0) {
    const items = mentionedMerchants.map(name => ({
      name,
      ...merchantMap[name],
      avg: merchantMap[name].count > 0 ? merchantMap[name].total / merchantMap[name].count : 0,
    }))
    return `Spending at ${mentionedMerchants.length === 1 ? 'this merchant' : 'these merchants'}:\n${items.map(m =>
      `• ${m.name}: $${m.total.toFixed(2)} (${m.count} visits, avg $${m.avg.toFixed(2)}/visit, ${m.category})`
    ).join('\n')}`
  }

  // ── AFFORDABILITY ──
  if (isAskingAffordability) {
    const match = msg.match(/\$?(\d+(?:\.\d{1,2})?)/)
    if (match) {
      const cost = parseFloat(match[1])
      if (cost <= 0) return "That doesn't seem like a valid amount. Could you specify the dollar amount?"
      if (incomeTotal === 0) return "I don't see any income in your transactions. Without income data, I can't determine affordability."

      const disposable = netCashflow
      const ratio = (cost / Math.max(disposable, 1)) * 100
      const savingsRate = (Math.max(0, netCashflow) / incomeTotal) * 100

      if (cost <= 0) return `A $${cost.toFixed(2)} purchase is essentially free — go for it!`

      let advice = ''
      if (cost <= 0) {
        advice = "That doesn't seem like a real cost."
      } else if (cost <= disposable * 0.1) {
        advice = `That's well within your means — only ${ratio.toFixed(0)}% of your disposable income.`
      } else if (cost <= disposable) {
        advice = `${ratio.toFixed(0)}% of your disposable income — reasonable, but be mindful of other expenses this month.`
      } else {
        const shortfall = cost - Math.max(0, disposable)
        const monthsToSave = Math.ceil(shortfall / Math.max(disposable, 1))
        advice = `You're $${shortfall.toFixed(2)} short. At your current savings rate (${savingsRate.toFixed(0)}%), you could save for it in about ${monthsToSave} month${monthsToSave > 1 ? 's' : ''}.`
      }

      return `A $${cost.toFixed(2)} purchase: ${advice}\n\nYour disposable income: $${Math.max(0, disposable).toFixed(2)}/mo\nIncome: $${incomeTotal.toFixed(2)}/mo\nExpenses: $${expenseTotal.toFixed(2)}/mo\nSavings rate: ${savingsRate.toFixed(0)}%`
    }
  }

  // ── SAVINGS / CUT COSTS ──
  if (isAskingSavings) {
    if (categories.length === 0) return "I don't have enough transaction data to suggest savings yet."

    const suggestions = categories.slice(0, 3).map(([cat, data]) => {
      const pct = expenseTotal > 0 ? ((data.total / expenseTotal) * 100).toFixed(0) : '0'
      const tenPct = data.total * 0.1
      return `• ${cat}: $${data.total.toFixed(2)} (${pct}% of expenses) — a 10% reduction saves $${tenPct.toFixed(2)}/mo`
    })

    // Find specific merchant savings opportunities
    const topMerchant = merchants[0]
    const merchantTip = topMerchant
      ? `\n\nTop merchant tip: You've spent $${topMerchant[1].total.toFixed(2)} at ${topMerchant[0]} (${topMerchant[1].count} visits). Cutting frequency by 1 visit/month could save ~$${(topMerchant[1].total / topMerchant[1].count * 0.5).toFixed(2)}.`
      : ''

    const savingsRate = incomeTotal > 0 ? ((netCashflow / incomeTotal) * 100).toFixed(0) : 'N/A'

    return `Here are your biggest saving opportunities:\n${suggestions.join('\n')}${merchantTip}\n\nCurrent savings rate: ${savingsRate}%\n\nTip: Focus on your top category first — even a small percentage cut there has the biggest impact.`
  }

  // ── SUMMARY / TOTAL SPENDING ──
  if (isAskingSummary) {
    const topCat = categories[0]
    const topMerchant = merchants[0]

    // Monthly comparison
    let monthTrend = ''
    if (lastMonthExpenses > 0) {
      const change = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      const arrow = change > 0 ? '↑' : '↓'
      monthTrend = `\n• This month vs last: ${arrow} ${Math.abs(change).toFixed(0)}% ($${lastMonthExpenses.toFixed(2)} → $${thisMonthExpenses.toFixed(2)})`
    }

    // Category diversity
    const catCount = categories.length
    const topCatPct = topCat ? ((topCat[1].total / expenseTotal) * 100).toFixed(0) : '0'
    const highestTx = transactions.filter(t => t.direction === 'debit').sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0]

    return `📊 Financial Summary\n\n• Income: $${incomeTotal.toFixed(2)}\n• Expenses: $${expenseTotal.toFixed(2)}\n• Net: $${netCashflow.toFixed(2)}\n• Transactions: ${txCount} total\n• Top category: ${topCat?.[0] || 'N/A'} (${topCatPct}% of spending)\n• Top merchant: ${topMerchant?.[0] || 'N/A'} ($${topMerchant?.[1].total.toFixed(2) || '0'})${monthTrend}\n\n• Spending diversity: ${catCount} categories\n• Biggest single transaction: ${highestTx ? `$${Math.abs(highestTx.amount).toFixed(2)} at ${highestTx.merchantName || highestTx.description}` : 'N/A'}\n• Savings rate: ${incomeTotal > 0 ? `${(Math.max(0, netCashflow) / incomeTotal * 100).toFixed(0)}%` : 'N/A'}`
  }

  // ── INCOME ──
  if (isAskingIncome) {
    const incomeTx = transactions.filter(t => t.direction === 'credit')
    if (incomeTx.length === 0) return "I don't see any income transactions. Have you linked an account with deposits?"
    const topIncome = Object.entries(
      incomeTx.reduce<Record<string, number>>((acc, t) => {
        const name = t.merchantName || t.description
        acc[name] = (acc[name] || 0) + Math.abs(t.amount)
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1])
    return `Your total income is $${incomeTotal.toFixed(2)} across ${incomeTx.length} transactions.\nSource: ${topIncome.slice(0, 3).map(([n, v]) => `${n} ($${v.toFixed(2)})`).join(', ') || 'N/A'}\n\nMonthly expenses: $${expenseTotal.toFixed(2)}\nRemaining: $${netCashflow.toFixed(2)} (${incomeTotal > 0 ? `${(netCashflow / incomeTotal * 100).toFixed(0)}%` : 'N/A'} of income)`
  }

  // ── MERCHANT LIST ──
  if (isAskingMerchants) {
    if (merchants.length === 0) return "No merchant data available yet."
    return `Your top merchants by spending:\n${merchants.slice(0, 8).map(([n, d], i) =>
      `• ${n}: $${d.total.toFixed(2)} (${d.count} visits, ${d.category})`
    ).join('\n')}\n\nTotal merchants: ${merchants.length}`
  }

  // ── TRENDS / COMPARISON ──
  if (isAskingTrend) {
    if (lastMonthExpenses === 0) return "Not enough historical data to show trends. Keep syncing transactions!"

    const change = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    const direction = change > 0 ? 'increased' : 'decreased'
    const arrow = change > 0 ? '↑' : '↓'

    // Category-level trends
    const catTrends = categories.map(([cat, data]) => {
      const lastMonth = lastMonthTx
        .filter(t => t.direction === 'debit' && cleanCategory(t.merchantCategory) === cat)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      const thisMonth = thisMonthTx
        .filter(t => t.direction === 'debit' && cleanCategory(t.merchantCategory) === cat)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      const catChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
      return { cat, lastMonth, thisMonth, catChange }
    }).filter(c => c.lastMonth > 0 || c.thisMonth > 0).sort((a, b) => Math.abs(b.catChange) - Math.abs(a.catChange))

    const biggestIncrease = catTrends.find(c => c.catChange > 0)
    const biggestDecrease = catTrends.find(c => c.catChange < 0)

    let trendDetails = ''
    if (catTrends.length > 0) {
      trendDetails = `\n\nCategory trends (this month vs last):\n${catTrends.slice(0, 5).map(c =>
        `• ${c.cat}: ${c.catChange > 0 ? '↑' : '↓'} ${Math.abs(c.catChange).toFixed(0)}% ($${c.lastMonth.toFixed(2)} → $${c.thisMonth.toFixed(2)})`
      ).join('\n')}`
    }

    return `Your expenses have ${direction} by ${Math.abs(change).toFixed(0)}% ${arrow}\nThis month: $${thisMonthExpenses.toFixed(2)} vs Last month: $${lastMonthExpenses.toFixed(2)}${trendDetails}${biggestIncrease ? `\n\n📈 Fastest growing: ${biggestIncrease.cat} (↑ ${biggestIncrease.catChange.toFixed(0)}%)` : ''}${biggestDecrease ? `\n📉 Biggest drop: ${biggestDecrease.cat} (↓ ${Math.abs(biggestDecrease.catChange).toFixed(0)}%)` : ''}`
  }

  // ── BUDGET ──
  if (isAskingBudget) {
    if (categories.length === 0) return `Your total expenses are $${expenseTotal.toFixed(2)}. Set up category budgets to get more specific suggestions.`
    return `Here's your current spending by category:\n${categories.slice(0, 5).map(([c, d]) =>
      `• ${c}: $${d.total.toFixed(2)} (${d.count} transactions)`
    ).join('\n')}\n\nTotal: $${expenseTotal.toFixed(2)}\n\nConsider setting monthly budgets for your top categories in the Budgets section. A good starting point is ${categories[0] ? `capping ${categories[0][0]} at $${(categories[0][1].total * 1.1).toFixed(0)}` : ''}.`
  }

  // ── LARGEST / TOP ──
  if (isAskingLargest) {
    const largestTx = transactions.filter(t => t.direction === 'debit').sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5)
    return `Your largest expenses:\n${largestTx.map((t, i) =>
      `• $${Math.abs(t.amount).toFixed(2)} — ${t.merchantName || t.description} (${new Date(t.date).toLocaleDateString()})`
    ).join('\n')}\n\nTop category overall: ${categories[0]?.[0] || 'N/A'} ($${categories[0]?.[1].total.toFixed(2) || '0'})`
  }

  // ── WEEKLY ──
  if (isAskingWeekly) {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const weekTx = transactions.filter(t => t.date >= weekAgo)
    const weekExp = weekTx.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
    const weekInc = weekTx.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
    return `This week (last 7 days):\n• Spent: $${weekExp.toFixed(2)}\n• Earned: $${weekInc.toFixed(2)}\n• Net: $${(weekInc - weekExp).toFixed(2)}\n• Transactions: ${weekTx.length}`
  }

  // ── MONTHLY ──
  if (isAskingMonthly) {
    return `This month so far:\n• Spent: $${thisMonthExpenses.toFixed(2)}\n• Earned: $${thisMonthIncome.toFixed(2)}\n• Net: $${(thisMonthIncome - thisMonthExpenses).toFixed(2)}${lastMonthExpenses > 0 ? `\n• Change vs last month: ${((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(0)}%` : ''}\n\nDaily average spend: $${thisMonthExpenses / Math.max(1, now.getDate())}`
  }

  // ── DEFAULT: COMPREHENSIVE OVERVIEW ──
  const topCatName = categories[0]?.[0] || 'N/A'
  const topCatAmt = categories[0]?.[1].total || 0
  const topMerchName = merchants[0]?.[0] || 'N/A'
  const topMerchAmt = merchants[0]?.[1].total || 0
  const catCount = categories.length
  const savingsRate = incomeTotal > 0 ? ((Math.max(0, netCashflow) / incomeTotal) * 100).toFixed(0) : 'N/A'

  return `I have ${txCount} transactions analyzed ($${incomeTotal.toFixed(2)} income, $${expenseTotal.toFixed(2)} expenses).

📊 AT A GLANCE
• Top category: ${topCatName} ($${topCatAmt.toFixed(2)})
• Top merchant: ${topMerchName} ($${topMerchAmt.toFixed(2)})
• Spending categories: ${catCount}
• Savings rate: ${savingsRate}%
• This month: $${thisMonthExpenses.toFixed(2)} spent${lastMonthExpenses > 0 ? ` (${((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(0)}% vs last month)` : ''}

💡 Try asking:
• "How much did I spend on dining in the last 3 months?"
• "Can I afford a $500 purchase?"
• "Where can I save money?"
• "What's my spending trend?"
• "Compare this month to last month"
• "What are my biggest expenses?"`
}

export async function chatWithData(
  userMessage: string,
  transactions: Transaction[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  context?: {
    budgets?: { category: string; amount: number; period: string; spent: number; remaining: number }[]
    goals?: { name: string; targetAmount: number; currentAmount: number; deadline: string | null }[]
    debts?: { strategy: string; extraPayment: number; liability: { name: string; balance: number; interestRate?: number | null } | null }[]
  }
): Promise<string> {
  const totalExpenses = transactions.filter((t) => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = transactions.filter((t) => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)

  const byCategory: Record<string, number> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const cat = cleanCategory(t.merchantCategory)
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
  }
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10)

  let contextStr = ''
  if (context?.budgets?.length) {
    contextStr += `\nBudgets:\n${context.budgets.map(b => `- ${b.category}: ${b.amount}/${b.spent} spent (${b.remaining} remaining)`).join('\n')}\n`
  }
  if (context?.goals?.length) {
    contextStr += `\nGoals:\n${context.goals.map(g => `- ${g.name}: ${g.currentAmount}/${g.targetAmount}${g.deadline ? ` by ${g.deadline}` : ''}`).join('\n')}\n`
  }
  if (context?.debts?.length) {
    contextStr += `\nDebt Plans:\n${context.debts.map(d => `- ${d.liability?.name || 'Unknown'} (${d.strategy}): extra ${d.extraPayment}/mo`).join('\n')}\n`
  }

  const systemPrompt = `You are a personal finance assistant with access to the user's transaction data. Be concise, specific, and actionable. Always reference actual numbers.

Transaction summary: ${transactions.length} transactions, $${totalIncome.toFixed(2)} income, $${totalExpenses.toFixed(2)} expenses.
Top categories: ${topCategories.map(([c, v]) => `${c} ($${v.toFixed(2)})`).join(', ')}${contextStr}

When you need more specific data, use the available tools to search transactions, get category breakdowns, or find merchant information.`

  const tools: any[] = [
    {
      name: 'search_transactions',
      description: 'Search transactions by merchant, category, amount range, or date range. Returns up to 50 results.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term for merchant name or description' },
          category: { type: 'string', description: 'Filter by category (e.g. Food & Dining, Shopping)' },
          min_amount: { type: 'number', description: 'Minimum amount filter' },
          max_amount: { type: 'number', description: 'Maximum amount filter' },
          direction: { type: 'string', enum: ['debit', 'credit'], description: 'credit or debit' },
          days_back: { type: 'number', description: 'How many days back to search' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
    {
      name: 'get_category_totals',
      description: 'Get total spending per category, optionally filtered by date range.',
      input_schema: {
        type: 'object',
        properties: {
          days_back: { type: 'number', description: 'Number of days to look back' },
          direction: { type: 'string', enum: ['debit', 'credit'], description: 'credit or debit' },
        },
      },
    },
    {
      name: 'get_merchant_info',
      description: 'Get detailed spending info for a specific merchant.',
      input_schema: {
        type: 'object',
        properties: {
          merchant_name: { type: 'string', description: 'Merchant name to look up' },
        },
        required: ['merchant_name'],
      },
    },
  ]

  function searchTransactions(args: Record<string, any>): Transaction[] {
    let results = [...transactions]
    if (args.query) {
      const q = args.query.toLowerCase()
      results = results.filter(t => (t.merchantName || t.description || '').toLowerCase().includes(q))
    }
    if (args.category) {
      const cat = args.category.toLowerCase()
      results = results.filter(t => cleanCategory(t.merchantCategory).toLowerCase().includes(cat))
    }
    if (args.min_amount !== undefined) results = results.filter(t => Math.abs(t.amount) >= args.min_amount)
    if (args.max_amount !== undefined) results = results.filter(t => Math.abs(t.amount) <= args.max_amount)
    if (args.direction) results = results.filter(t => t.direction === args.direction)
    if (args.days_back) {
      const cutoff = new Date(Date.now() - args.days_back * 86400000).toISOString()
      results = results.filter(t => t.date >= cutoff)
    }
    const limit = args.limit || 20
    results = results.slice(0, limit)
    return results.map(t => ({ ...t, amount: Math.abs(t.amount) }))
  }

  function getCategoryTotals(args: Record<string, any>): { category: string; total: number; count: number }[] {
    let filtered = [...transactions]
    if (args.direction) filtered = filtered.filter(t => t.direction === args.direction)
    if (args.days_back) {
      const cutoff = new Date(Date.now() - args.days_back * 86400000).toISOString()
      filtered = filtered.filter(t => t.date >= cutoff)
    }
    const cats: Record<string, { total: number; count: number }> = {}
    for (const t of filtered) {
      const cat = cleanCategory(t.merchantCategory || 'Uncategorized')
      if (!cats[cat]) cats[cat] = { total: 0, count: 0 }
      cats[cat].total += Math.abs(t.amount)
      cats[cat].count++
    }
    return Object.entries(cats).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.total - a.total)
  }

  function getMerchantInfo(args: Record<string, any>): { merchantName: string; total: number; count: number; avgAmount: number; category: string } | null {
    const q = args.merchant_name?.toLowerCase()
    if (!q) return null
    const txns = transactions.filter(t => (t.merchantName || t.description || '').toLowerCase().includes(q))
    if (txns.length === 0) return null
    const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0)
    return {
      merchantName: txns[0].merchantName || txns[0].description,
      total,
      count: txns.length,
      avgAmount: total / txns.length,
      category: cleanCategory(txns[0].merchantCategory),
    }
  }

  const messages: any[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  try {
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      tools,
    })

    let finalContent = ''

    for (const block of response.content) {
      if (block.type === 'text') {
        finalContent += block.text
      } else if (block.type === 'tool_use') {
        const args = block.input as Record<string, any>
        let result: any

        switch (block.name) {
          case 'search_transactions':
            result = searchTransactions(args)
            break
          case 'get_category_totals':
            result = getCategoryTotals(args)
            break
          case 'get_merchant_info':
            result = getMerchantInfo(args)
            break
          default:
            result = { error: 'Unknown tool' }
        }

        messages.push({ role: 'assistant', content: response.content })
        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          }],
        })

        const followUp = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        })

        for (const fb of followUp.content) {
          if (fb.type === 'text') finalContent += fb.text
        }
      }
    }

    return finalContent || 'I analyzed your data but could not generate a response.'
  } catch (err) {
    console.error('AI chat failed, using local fallback:', err)
    return chatLocalFallback(userMessage, transactions, conversationHistory)
  }
}
