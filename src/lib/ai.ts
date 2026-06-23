import Anthropic from '@anthropic-ai/sdk'
import type { Transaction, AiAnalysis } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface AnalysisInput {
  transactions: Transaction[]
  period: 'week' | 'month' | 'quarter'
  userLocation?: { city?: string; country?: string }
}

export async function analyzeSpending(input: AnalysisInput): Promise<AiAnalysis> {
  const { transactions, period, userLocation } = input

  const debits = transactions.filter((t) => t.direction === 'debit')
  const credits = transactions.filter((t) => t.direction === 'credit')

  const totalExpenses = debits.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = credits.reduce((s, t) => s + Math.abs(t.amount), 0)

  // Aggregate by category
  const byCategory: Record<string, { total: number; count: number; merchants: string[] }> = {}
  for (const t of debits) {
    const cat = t.merchantCategory || 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, merchants: [] }
    byCategory[cat].total += Math.abs(t.amount)
    byCategory[cat].count++
    if (t.merchantName && !byCategory[cat].merchants.includes(t.merchantName)) {
      byCategory[cat].merchants.push(t.merchantName)
    }
  }

  // Aggregate by merchant
  const byMerchant: Record<string, { total: number; count: number; category: string }> = {}
  for (const t of debits) {
    const name = t.merchantName || t.description
    if (!byMerchant[name]) byMerchant[name] = { total: 0, count: 0, category: t.merchantCategory || 'General' }
    byMerchant[name].total += Math.abs(t.amount)
    byMerchant[name].count++
  }

  // Location data
  const locationCounts: Record<string, number> = {}
  for (const t of debits) {
    if (t.merchantCity) {
      const loc = `${t.merchantCity}${t.merchantCountry ? `, ${t.merchantCountry}` : ''}`
      locationCounts[loc] = (locationCounts[loc] || 0) + Math.abs(t.amount)
    }
  }

  const prompt = `You are a personal finance AI analyst. Analyze this spending data and return ONLY valid JSON (no markdown, no explanation).

Period: ${period}
Total income: $${totalIncome.toFixed(2)}
Total expenses: $${totalExpenses.toFixed(2)}
Transaction count: ${transactions.length}
User location hint: ${userLocation ? JSON.stringify(userLocation) : 'not provided'}

Spending by category:
${JSON.stringify(byCategory, null, 2)}

Top merchants by spend:
${JSON.stringify(
  Object.entries(byMerchant)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([name, data]) => ({ name, ...data })),
  null,
  2
)}

Spending by location:
${JSON.stringify(locationCounts, null, 2)}

Return a JSON object with exactly this shape:
{
  "summary": "2-3 sentence plain English overview of spending health",
  "topInsight": "single most actionable insight in one sentence",
  "categoryBreakdown": [
    {
      "category": "string",
      "total": number,
      "count": number,
      "percentage": number,
      "trend": number
    }
  ],
  "merchantAlternatives": [
    {
      "merchantName": "string",
      "category": "string",
      "totalSpent": number,
      "visitCount": number,
      "avgTransaction": number,
      "alternatives": [
        {
          "name": "string",
          "estimatedSavings": number,
          "reason": "string"
        }
      ]
    }
  ],
  "locationInsights": [
    {
      "city": "string",
      "country": "string",
      "totalSpent": number,
      "topCategories": ["string"],
      "suggestions": ["string"]
    }
  ],
  "savingsOpportunities": [
    {
      "title": "string",
      "description": "string",
      "estimatedMonthlySavings": number,
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "cashflowHealth": "excellent" | "good" | "fair" | "concerning",
  "monthlyBudgetSuggestion": number
}

Base merchantAlternatives on real cheaper alternatives that actually exist for each merchant's country/city. Provide 3-5 savings opportunities. Be specific and actionable.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()

  try {
    return JSON.parse(cleaned) as AiAnalysis
  } catch {
    throw new Error('Failed to parse AI analysis response')
  }
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
