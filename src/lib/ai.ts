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

const MODEL = 'claude-3-5-sonnet-20241022'

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
  const msg = userMessage.toLowerCase()

  const incomeTotal = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenseTotal = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)

  const byCategory: Record<string, number> = {}
  for (const t of transactions) {
    if (t.direction !== 'debit') continue
    const cat = cleanCategory(t.merchantCategory)
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
  }

  const topMerchant = transactions
    .filter(t => t.direction === 'debit')
    .reduce<Record<string, number>>((acc, t) => {
      const name = t.merchantName || t.description
      acc[name] = (acc[name] || 0) + Math.abs(t.amount)
      return acc
    }, {})

  const topMerchantName = Object.entries(topMerchant).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  // Spending on food / dining
  if (msg.includes('food') || msg.includes('dining') || msg.includes('eat') || msg.includes('restaurant') || msg.includes('groceries') || msg.includes('coffee')) {
    const foodCats = Object.entries(byCategory).filter(([cat]) => /food|dining|groceries|coffee|restaurant|drink/i.test(cat))
    if (foodCats.length > 0) {
      const total = foodCats.reduce((s, [, v]) => s + v, 0)
      const details = foodCats.map(([c, v]) => `${c}: $${v.toFixed(2)}`).join(', ')
      return `You've spent a total of $${total.toFixed(2)} on food and dining across ${foodCats.length} categories. Breakdown: ${details}.`
    }
    if (transactions.length === 0) return "You don't have any transactions yet. Connect a bank account or add manual transactions to track your spending."
    return `I can see your transactions but I don't have food-specific data. Your total expenses are $${expenseTotal.toFixed(2)}. The top categories are: ${topCat.slice(0, 3).map(([c, v]) => `${c} ($${v.toFixed(2)})`).join(', ')}.`
  }

  // Can I afford X?
  const affordMatch = msg.match(/(?:can|should) i afford\??\s*\$?(\d+(?:\.\d{1,2})?)/i) || msg.match(/\$?(\d+(?:\.\d{1,2})?)\s*purchase/i) || msg.match(/afford a?\s*\$?(\d+(?:\.\d{1,2})?)/i)
  if (affordMatch) {
    const cost = parseFloat(affordMatch[1])
    const income = incomeTotal
    const expenses = expenseTotal
    const disposable = income - expenses
    if (income === 0) return "I can't see any income in your transactions yet. Without income data, it's hard to say if you can afford it."
    if (cost <= disposable * 0.5) return `Based on your finances, you have about $${disposable.toFixed(2)} of disposable income this period. A $${cost.toFixed(2)} purchase is ${cost <= disposable ? 'affordable' : 'a stretch'} — it's ${((cost / disposable) * 100).toFixed(0)}% of your disposable income.`
    return `A $${cost.toFixed(2)} purchase would be $${
      (cost - Math.max(0, disposable)).toFixed(2)
    } beyond your current disposable income of $${Math.max(0, disposable).toFixed(2)}. Consider saving for it over a few months.`
  }

  // Save money
  if (msg.includes('save') || msg.includes('cut') || msg.includes('reduce') || msg.includes('cheaper')) {
    if (topCat.length === 0) return "I don't have enough data to suggest savings yet. Sync your transactions first."
    const suggestions = topCat.slice(0, 3).map(([cat, total]) => {
      const pct = expenseTotal > 0 ? ((total / expenseTotal) * 100).toFixed(0) : '0'
      return `• ${cat}: $${total.toFixed(2)} (${pct}% of expenses) — try reducing by 10% to save $${(total * 0.1).toFixed(2)}`
    })
    return `Here are your top spending categories and how to save:\n${suggestions.join('\n')}\n\nYour savings rate is currently ${incomeTotal > 0 ? `${(((incomeTotal - expenseTotal) / incomeTotal) * 100).toFixed(0)}%` : 'N/A'}.`
  }

  // Total spending
  if (msg.includes('total') || msg.includes('spent') || msg.includes('spend') || msg.includes('expense') || msg.includes('overview') || msg.includes('summary')) {
    if (transactions.length === 0) return "You don't have any transactions yet. Connect a bank account or add manual transactions."
    return `Here's your financial summary:\n• Income: $${incomeTotal.toFixed(2)}\n• Expenses: $${expenseTotal.toFixed(2)}\n• Net: $${(incomeTotal - expenseTotal).toFixed(2)}\n• Transactions: ${transactions.length}\n• Top category: ${topCat[0]?.[0] || 'N/A'} ($${(topCat[0]?.[1] || 0).toFixed(2)})\n• Top merchant: ${topMerchantName || 'N/A'}`
  }

  // Where did I spend
  if (msg.includes('where') || msg.includes('merchant') || msg.includes('stores') || msg.includes('shopping')) {
    const merchants = Object.entries(topMerchant).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (merchants.length === 0) return "No merchant data available yet."
    return `Your top merchants:\n${merchants.map(([n, v]) => `• ${n}: $${v.toFixed(2)}`).join('\n')}`
  }

  // Income
  if (msg.includes('income') || msg.includes('earn') || msg.includes('salary') || msg.includes('pay')) {
    return `Your total income is $${incomeTotal.toFixed(2)} across ${transactions.filter(t => t.direction === 'credit').length} credit transactions.`
  }

  // Budget
  if (msg.includes('budget')) {
    if (topCat.length === 0) return "Set up budgets in the Budgets page to get suggestions. Your current expenses are $" + expenseTotal.toFixed(2) + "."
    return `Your top 3 spending categories:\n${topCat.slice(0, 3).map(([c, v]) => `• ${c}: $${v.toFixed(2)}`).join('\n')}\n\nConsider setting monthly budgets for these in the Budgets section.`
  }

  // Default
  if (transactions.length === 0) return "I don't have any transaction data to analyze yet. Link a bank account or add manual transactions from the sidebar."
  return `I have ${transactions.length} transactions to work with ($${incomeTotal.toFixed(2)} income, $${expenseTotal.toFixed(2)} expenses). Try asking specific questions like:\n• "How much did I spend on food?"\n• "Can I afford a $500 purchase?"\n• "Where can I save money?"\n• "What's my total spending?"`
}

export async function chatWithData(
  userMessage: string,
  transactions: Transaction[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const summary = {
    count: transactions.length,
    totalExpenses: transactions.filter((t) => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0),
    totalIncome: transactions.filter((t) => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0),
    recentTransactions: transactions.slice(0, 20),
  }

  const systemPrompt = `You are a personal finance assistant with access to the user's transaction data. Be concise, specific, and actionable. Always reference actual numbers from their data when relevant.

Current transaction summary:
${JSON.stringify(summary, null, 2)}`

  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    return response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('AI chat failed, using local fallback:', err)
    return chatLocalFallback(userMessage, transactions, conversationHistory)
  }
}
