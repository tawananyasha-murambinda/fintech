import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Coffee', 'Shopping', 'Transportation',
  'Entertainment', 'Bills & Utilities', 'Health & Fitness', 'Travel',
  'Education', 'Income', 'Transfer', 'Rent', 'Insurance', 'Personal Care',
  'Home Improvement', 'Gifts & Donations', 'Subscriptions',
]

export async function aiCategorize(merchantName: string, description: string): Promise<string | null> {
  try {
    const prompt = `Categorize this merchant/transaction into one of these categories: ${CATEGORIES.join(', ')}

Merchant: ${merchantName}
Description: ${description}

Return ONLY the category name, nothing else. If unsure, return "Uncategorized".`

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 32,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : null
    if (text && CATEGORIES.includes(text)) return text
    return null
  } catch {
    return null
  }
}

export function applyRules(
  merchantName: string,
  description: string,
  rules: { matchType: string; matchValue: string; category: string }[]
): string | null {
  const text = (merchantName + ' ' + description).toLowerCase()
  const sorted = [...rules].sort((a, b) => (b as any).priority - (a as any).priority || 0)
  for (const rule of sorted) {
    const val = rule.matchValue.toLowerCase()
    switch (rule.matchType) {
      case 'merchant':
        if (merchantName.toLowerCase().includes(val)) return rule.category
        break
      case 'description':
        if (description.toLowerCase().includes(val)) return rule.category
        break
      case 'amount_lt':
        break
      case 'amount_gt':
        break
      default:
        if (text.includes(val)) return rule.category
    }
  }
  return null
}
