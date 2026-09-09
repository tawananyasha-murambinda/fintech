import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}
// Categorisation is a high-volume, single-label classification: it runs once
// per uncategorised transaction, so it uses the cheaper model rather than the
// Opus default the analysis surfaces use.
const MODEL = process.env.ANTHROPIC_CATEGORIZE_MODEL || 'claude-sonnet-5'

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

    const client = getClient()
    if (!client) return null

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 32,
      // Picking one label off a fixed list needs no reasoning, and thinking
      // tokens would eat the 32-token ceiling before any answer came back.
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    if (text && CATEGORIES.includes(text)) return text
    return null
  } catch {
    return null
  }
}

export type CategorizationRule = {
  matchType: string
  matchValue: string
  category: string
  priority?: number
}

/**
 * First matching rule wins, highest priority first.
 *
 * `amount_lt` and `amount_gt` were declared as match types, offered in the
 * rules UI, and implemented as empty branches — a rule of either kind silently
 * matched nothing. They now compare against the transaction amount, which the
 * caller has to supply.
 */
export function applyRules(
  merchantName: string,
  description: string,
  rules: CategorizationRule[],
  amount?: number
): string | null {
  const text = (merchantName + ' ' + description).toLowerCase()
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  for (const rule of sorted) {
    const val = rule.matchValue.toLowerCase()
    switch (rule.matchType) {
      case 'merchant':
        if (merchantName.toLowerCase().includes(val)) return rule.category
        break
      case 'description':
        if (description.toLowerCase().includes(val)) return rule.category
        break
      case 'amount_lt': {
        const threshold = parseFloat(rule.matchValue)
        if (amount !== undefined && Number.isFinite(threshold) && Math.abs(amount) < threshold) {
          return rule.category
        }
        break
      }
      case 'amount_gt': {
        const threshold = parseFloat(rule.matchValue)
        if (amount !== undefined && Number.isFinite(threshold) && Math.abs(amount) > threshold) {
          return rule.category
        }
        break
      }
      default:
        if (text.includes(val)) return rule.category
    }
  }
  return null
}
