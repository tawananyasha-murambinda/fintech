import { canonicalCategory } from '@/lib/categories'
import { round, sum } from '@/lib/money'

// Recurring-charge detection.
//
// The previous version had three problems that made its headline number wrong:
//   • `monthlyAmount` was the average charge, whatever the cadence — a £120
//     yearly subscription was reported as £120 a month, and the "total
//     monthly" figure summed those.
//   • Any merchant billed twice at the same amount was a subscription, so two
//     identically-priced coffees became a recurring charge.
//   • It rounded to whole units, so £9.99 displayed as £10.
//
// Detection now needs a regular *interval*, not just a repeated amount, and
// every figure is normalised to a monthly equivalent.

const DAY_MS = 24 * 60 * 60 * 1000

export const SUBSCRIPTION_KEYWORDS =
  /netflix|spotify|apple music|youtube|hulu|disney|hbo|max|amazon prime|audible|kindle|chatgpt|openai|anthropic|claude|midjourney|notion|figma|adobe|canva|grammarly|duolingo|strava|peloton|fitbit|headspace|calm|crunchyroll|paramount|peacock|tidal|deezer|soundcloud|pandora|dropbox|google one|icloud|microsoft 365|patreon|substack|medium|new york times|washington post|wsj|the economist|skillshare|masterclass|udemy|linkedin premium|github|gitlab|vercel|netlify|1password|lastpass|nordvpn|expressvpn/i

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular'

/** Names the cadence a median gap in days most closely represents. */
export function classifyCadence(medianGapDays: number): Cadence {
  if (medianGapDays >= 5 && medianGapDays <= 9) return 'weekly'
  if (medianGapDays >= 26 && medianGapDays <= 35) return 'monthly'
  if (medianGapDays >= 84 && medianGapDays <= 98) return 'quarterly'
  if (medianGapDays >= 350 && medianGapDays <= 380) return 'yearly'
  return 'irregular'
}

export function monthlyEquivalent(amount: number, cadence: Cadence): number {
  if (cadence === 'weekly') return round((amount * 52) / 12)
  if (cadence === 'quarterly') return round(amount / 3)
  if (cadence === 'yearly') return round(amount / 12)
  return round(amount)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export type DetectedSubscription = {
  name: string
  category: string
  /** The typical charge, at its real cadence. */
  amount: number
  /** That charge normalised to a month, which is what totals should use. */
  monthlyAmount: number
  cadence: Cadence
  medianGapDays: number
  lastCharge: string
  nextExpected: string | null
  transactionCount: number
  /** 0–1. Keyword matches and steady intervals raise it. */
  confidence: number
  /** True when the most recent charge differs from the established norm. */
  priceChanged: boolean
  previousAmount: number | null
}

export type SubscriptionInput = {
  merchantName: string | null
  description: string
  merchantCategory: string | null
  amount: number
  date: Date
}

export function detectSubscriptions(
  transactions: SubscriptionInput[],
  now: Date = new Date()
): { subscriptions: DetectedSubscription[]; totalMonthly: number; totalYearly: number } {
  const byMerchant = new Map<string, SubscriptionInput[]>()
  for (const t of transactions) {
    const name = (t.merchantName || t.description || '').trim()
    if (!name) continue
    if (!byMerchant.has(name)) byMerchant.set(name, [])
    byMerchant.get(name)!.push(t)
  }

  const subscriptions: DetectedSubscription[] = []

  for (const [name, charges] of byMerchant) {
    if (charges.length < 2) continue

    const sorted = [...charges].sort((a, b) => a.date.getTime() - b.date.getTime())
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / DAY_MS)
    }

    const medianGap = median(gaps)
    const cadence = classifyCadence(medianGap)
    const isKeywordMatch = SUBSCRIPTION_KEYWORDS.test(name)

    // How steady the intervals are. A subscription bills on a rhythm; a shop
    // you happen to visit twice does not.
    const gapVariance =
      gaps.length > 1 && medianGap > 0
        ? median(gaps.map((g) => Math.abs(g - medianGap))) / medianGap
        : 1
    const isRegular = cadence !== 'irregular' && gapVariance <= 0.35

    const amounts = sorted.map((c) => Math.abs(c.amount))
    const typicalAmount = round(median(amounts))
    const latestAmount = round(amounts[amounts.length - 1])

    // Two same-priced coffees are not a subscription. Require either a known
    // provider name, or three-plus charges on a genuinely regular interval.
    const qualifies = isKeywordMatch
      ? charges.length >= 2
      : charges.length >= 3 && isRegular

    if (!qualifies) continue

    // A charge every ~30 days from a known provider is monthly even if the
    // window was too short to prove it statistically.
    const effectiveCadence: Cadence = cadence === 'irregular' && isKeywordMatch ? 'monthly' : cadence

    const lastCharge = sorted[sorted.length - 1]
    const nextExpected =
      effectiveCadence === 'irregular'
        ? null
        : new Date(lastCharge.date.getTime() + medianGap * DAY_MS)

    const priceChanged = amounts.length >= 3 && Math.abs(latestAmount - typicalAmount) > 0.01

    subscriptions.push({
      name,
      category: canonicalCategory(lastCharge.merchantCategory),
      amount: typicalAmount,
      monthlyAmount: monthlyEquivalent(typicalAmount, effectiveCadence),
      cadence: effectiveCadence,
      medianGapDays: Math.round(medianGap),
      lastCharge: lastCharge.date.toISOString(),
      nextExpected: nextExpected && nextExpected > now ? nextExpected.toISOString() : null,
      transactionCount: charges.length,
      confidence: Math.min(
        1,
        (isKeywordMatch ? 0.5 : 0) + (isRegular ? 0.35 : 0) + Math.min(charges.length / 12, 0.15)
      ),
      priceChanged,
      previousAmount: priceChanged ? typicalAmount : null,
    })
  }

  subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount)
  const totalMonthly = sum(subscriptions.map((s) => s.monthlyAmount))

  return {
    subscriptions,
    totalMonthly,
    totalYearly: round(totalMonthly * 12),
  }
}
