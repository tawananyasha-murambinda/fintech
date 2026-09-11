import { canonicalCategory, CATEGORIES } from '@/lib/categories'

// Turns "coffee over £5 last month" into a query.
//
// Deliberately not an LLM call: search has to be instant and free, it runs on
// every keystroke, and the phrasing people actually use for this is a small,
// closed set. The assistant is there for questions that need reasoning; this is
// for filtering a list.
//
// Anything it cannot parse is left as free text rather than dropped, so a
// search is never silently narrowed by a word that was misread.

export type ParsedQuery = {
  text: string | null
  category: string | null
  minAmount: number | null
  maxAmount: number | null
  direction: 'debit' | 'credit' | null
  from: Date | null
  to: Date | null
  /** What was understood, for showing back to the user as removable chips. */
  matched: { label: string; kind: string }[]
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseSearchQuery(raw: string, now: Date = new Date()): ParsedQuery {
  const result: ParsedQuery = {
    text: null,
    category: null,
    minAmount: null,
    maxAmount: null,
    direction: null,
    from: null,
    to: null,
    matched: [],
  }

  if (!raw?.trim()) return result

  let rest = ` ${raw.toLowerCase().trim()} `
  const consume = (pattern: RegExp, label: string, kind: string) => {
    const before = rest
    rest = rest.replace(pattern, ' ')
    if (rest !== before) result.matched.push({ label, kind })
  }

  // --- amounts. "over 5", "under £20", "between 10 and 50", "£5-£20" ---
  const between = rest.match(/between\s*[£$€]?\s*(\d+(?:\.\d+)?)\s*(?:and|-|to)\s*[£$€]?\s*(\d+(?:\.\d+)?)/)
  if (between) {
    result.minAmount = parseFloat(between[1])
    result.maxAmount = parseFloat(between[2])
    consume(new RegExp(between[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${between[1]}–${between[2]}`, 'amount')
  } else {
    const over = rest.match(/(?:over|above|more than|greater than|>)\s*[£$€]?\s*(\d+(?:\.\d+)?)/)
    if (over) {
      result.minAmount = parseFloat(over[1])
      consume(new RegExp(over[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `over ${over[1]}`, 'amount')
    }
    const under = rest.match(/(?:under|below|less than|cheaper than|<)\s*[£$€]?\s*(\d+(?:\.\d+)?)/)
    if (under) {
      result.maxAmount = parseFloat(under[1])
      consume(new RegExp(under[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `under ${under[1]}`, 'amount')
    }
  }

  // --- direction ---
  if (/\b(income|earned|paid in|received|refunds?|salary|money in)\b/.test(rest)) {
    result.direction = 'credit'
    consume(/\b(income|earned|paid in|received|refunds?|salary|money in)\b/, 'money in', 'direction')
  } else if (/\b(spent|spending|payments?|money out|purchases?)\b/.test(rest)) {
    result.direction = 'debit'
    consume(/\b(spent|spending|payments?|money out|purchases?)\b/, 'money out', 'direction')
  }

  // --- relative ranges ---
  const today = startOfDay(now)

  if (/\b(today)\b/.test(rest)) {
    result.from = today
    consume(/\btoday\b/, 'today', 'date')
  } else if (/\byesterday\b/.test(rest)) {
    result.from = new Date(today.getTime() - 86_400_000)
    result.to = today
    consume(/\byesterday\b/, 'yesterday', 'date')
  } else if (/\bthis week\b/.test(rest)) {
    const daysSinceMonday = (now.getDay() + 6) % 7
    result.from = new Date(today.getTime() - daysSinceMonday * 86_400_000)
    consume(/\bthis week\b/, 'this week', 'date')
  } else if (/\blast week\b/.test(rest)) {
    const daysSinceMonday = (now.getDay() + 6) % 7
    const thisMonday = new Date(today.getTime() - daysSinceMonday * 86_400_000)
    result.from = new Date(thisMonday.getTime() - 7 * 86_400_000)
    result.to = thisMonday
    consume(/\blast week\b/, 'last week', 'date')
  } else if (/\bthis month\b/.test(rest)) {
    result.from = new Date(now.getFullYear(), now.getMonth(), 1)
    consume(/\bthis month\b/, 'this month', 'date')
  } else if (/\blast month\b/.test(rest)) {
    result.from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    result.to = new Date(now.getFullYear(), now.getMonth(), 1)
    consume(/\blast month\b/, 'last month', 'date')
  } else if (/\bthis year\b/.test(rest)) {
    result.from = new Date(now.getFullYear(), 0, 1)
    consume(/\bthis year\b/, 'this year', 'date')
  } else {
    const lastN = rest.match(/\blast\s+(\d+)\s+(day|week|month)s?\b/)
    if (lastN) {
      const n = parseInt(lastN[1], 10)
      const unit = lastN[2]
      const days = unit === 'day' ? n : unit === 'week' ? n * 7 : n * 30
      result.from = new Date(today.getTime() - days * 86_400_000)
      consume(new RegExp(lastN[0]), `last ${n} ${unit}${n > 1 ? 's' : ''}`, 'date')
    } else {
      // A bare month name means that month in the current year, or last year
      // if it has not happened yet — "december" in March means last December.
      const monthHit = MONTHS.findIndex((m) => new RegExp(`\\b${m}\\b`).test(rest))
      if (monthHit !== -1) {
        const year = monthHit > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear()
        result.from = new Date(year, monthHit, 1)
        result.to = new Date(year, monthHit + 1, 1)
        consume(new RegExp(`\\b${MONTHS[monthHit]}\\b`), MONTHS[monthHit], 'date')
      }
    }
  }

  // --- category. Matched against the canonical vocabulary so "food" finds
  //     "Food & Dining" rather than searching merchant names for the word. ---
  for (const category of CATEGORIES) {
    if (category === 'Uncategorized') continue
    const words = category.toLowerCase().replace(/&/g, '').split(/\s+/).filter(Boolean)
    const hit = words.find((w) => w.length > 3 && new RegExp(`\\b${w}\\b`).test(rest))
    if (hit) {
      result.category = category
      consume(new RegExp(`\\b${hit}\\b`), category, 'category')
      break
    }
  }

  // Common words that mean a category but are not its name.
  if (!result.category) {
    const synonyms: Record<string, string> = {
      coffee: 'Coffee',
      restaurants: 'Food & Dining',
      eating: 'Food & Dining',
      takeaway: 'Food & Dining',
      supermarket: 'Groceries',
      petrol: 'Transportation',
      gas: 'Transportation',
      uber: 'Transportation',
      rent: 'Rent',
      bills: 'Bills & Utilities',
    }
    for (const [word, category] of Object.entries(synonyms)) {
      if (new RegExp(`\\b${word}\\b`).test(rest)) {
        result.category = canonicalCategory(category)
        consume(new RegExp(`\\b${word}\\b`), result.category, 'category')
        break
      }
    }
  }

  // Filler that would otherwise be searched for as merchant text.
  rest = rest.replace(/\b(show|me|my|all|the|a|an|on|in|at|for|of|from|and|did|i|spend|transactions?)\b/g, ' ')

  const leftover = rest.replace(/\s+/g, ' ').trim()
  result.text = leftover.length > 1 ? leftover : null

  return result
}
