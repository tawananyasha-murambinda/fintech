import { canonicalCategory } from '@/lib/categories'
import { round } from '@/lib/money'

// Unusual-spend detection.
//
// The existing alerts fire on totals — a budget exceeded, a category up 25% on
// last month. Those are lagging: by the time a monthly total is high, the money
// is gone. This looks at individual transactions against the user's own
// history, so a charge that is out of character is flagged the day it lands.
//
// Everything is relative to the person's own baseline. A £200 restaurant bill
// is unremarkable for one user and a red flag for another, so there are no
// absolute thresholds anywhere in here.

export type ScoredTransaction = {
  id: string
  date: Date
  amount: number
  merchantName: string | null
  description: string
  merchantCategory: string | null
}

export type Anomaly = {
  transactionId: string
  type: 'amount_outlier' | 'new_merchant_large' | 'duplicate_charge' | 'category_spike' | 'off_hours_foreign'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  amount: number
  merchant: string
}

/** Median absolute deviation — robust to the very outliers being hunted. */
function medianAbsoluteDeviation(values: number[], med: number): number {
  if (values.length === 0) return 0
  return median(values.map((v) => Math.abs(v - med)))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const MIN_HISTORY = 8
// 0.6745 converts a MAD into a standard-deviation-equivalent for normal data,
// so this threshold reads like "about 3.5 sigma" while resisting outliers.
const MAD_SCALE = 0.6745
const OUTLIER_THRESHOLD = 3.5

function merchantKey(t: ScoredTransaction): string {
  return (t.merchantName || t.description || 'Unknown').trim().toLowerCase()
}

function displayName(t: ScoredTransaction): string {
  return (t.merchantName || t.description || 'Unknown').trim()
}

/**
 * Scores recent transactions against a longer baseline.
 *
 * `recent` is what gets flagged; `baseline` is what "normal" is measured from
 * and should be a longer window that includes `recent`.
 */
export function detectAnomalies(
  recent: ScoredTransaction[],
  baseline: ScoredTransaction[]
): Anomaly[] {
  const debitsOnly = (list: ScoredTransaction[]) => list.filter((t) => t.amount !== 0)
  const history = debitsOnly(baseline)
  const anomalies: Anomaly[] = []

  if (history.length < MIN_HISTORY) return anomalies

  // --- per-category amount baselines ---
  const byCategory = new Map<string, number[]>()
  for (const t of history) {
    const cat = canonicalCategory(t.merchantCategory)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(Math.abs(t.amount))
  }

  // --- merchants already seen, and how much is normal at each ---
  const byMerchant = new Map<string, number[]>()
  const merchantFirstSeen = new Map<string, Date>()
  for (const t of history) {
    const key = merchantKey(t)
    if (!byMerchant.has(key)) byMerchant.set(key, [])
    byMerchant.get(key)!.push(Math.abs(t.amount))
    const seen = merchantFirstSeen.get(key)
    if (!seen || t.date < seen) merchantFirstSeen.set(key, t.date)
  }

  const allAmounts = history.map((t) => Math.abs(t.amount))
  const overallMedian = median(allAmounts)
  const largeThreshold = overallMedian * 5

  const flagged = new Set<string>()

  // 1. Same merchant, same amount, same day — the classic double-charge.
  // Checked before the amount rules: a duplicate is the most actionable
  // finding, and a large duplicate would otherwise be reported only as
  // "unusually large", which the user cannot act on in the same way.
  const sameDayKey = new Map<string, ScoredTransaction[]>()
  for (const t of debitsOnly(recent)) {
    const key = `${merchantKey(t)}|${t.date.toISOString().slice(0, 10)}|${Math.abs(t.amount).toFixed(2)}`
    if (!sameDayKey.has(key)) sameDayKey.set(key, [])
    sameDayKey.get(key)!.push(t)
  }

  for (const group of sameDayKey.values()) {
    if (group.length < 2) continue
    const [first] = group
    // Only the duplicate is flagged, not the legitimate original.
    for (const t of group.slice(1)) {
      if (flagged.has(t.id)) continue
      anomalies.push({
        transactionId: t.id,
        type: 'duplicate_charge',
        severity: 'warning',
        title: `Possible duplicate charge`,
        message: `${displayName(first)} charged ${Math.abs(first.amount).toFixed(2)} ${group.length} times on the same day. If it was a single purchase, this is worth disputing.`,
        amount: round(Math.abs(t.amount)),
        merchant: displayName(first),
      })
      flagged.add(t.id)
    }
  }


  for (const t of debitsOnly(recent)) {
    const amount = Math.abs(t.amount)
    const key = merchantKey(t)
    const name = displayName(t)
    const category = canonicalCategory(t.merchantCategory)

    if (flagged.has(t.id)) continue

    // 2. Unusually large for this category, judged by the user's own spread.
    const categoryAmounts = byCategory.get(category) ?? []
    if (categoryAmounts.length >= MIN_HISTORY && !flagged.has(t.id)) {
      const med = median(categoryAmounts)
      const mad = medianAbsoluteDeviation(categoryAmounts, med)
      // A MAD of zero means every historical charge was identical; fall back to
      // a plain multiple so a run of identical amounts cannot divide by zero.
      const score = mad > 0 ? (MAD_SCALE * (amount - med)) / mad : amount > med * 3 ? 99 : 0

      if (score > OUTLIER_THRESHOLD && amount > med * 2) {
        anomalies.push({
          transactionId: t.id,
          type: 'amount_outlier',
          severity: amount > med * 5 ? 'critical' : 'warning',
          title: `Unusually large ${category} charge`,
          message: `${name} charged ${amount.toFixed(2)} — your typical ${category} spend is around ${med.toFixed(2)}.`,
          amount: round(amount),
          merchant: name,
        })
        flagged.add(t.id)
      }
    }

    // 3. A large first-ever charge at a merchant never seen before.
    const seenBefore = byMerchant.has(key) && (byMerchant.get(key)?.length ?? 0) > 1
    if (!seenBefore && amount > largeThreshold && !flagged.has(t.id)) {
      anomalies.push({
        transactionId: t.id,
        type: 'new_merchant_large',
        severity: 'warning',
        title: `Large charge at a new merchant`,
        message: `${name} charged ${amount.toFixed(2)} and has not appeared in your history before. Worth confirming you recognise it.`,
        amount: round(amount),
        merchant: name,
      })
      flagged.add(t.id)
    }
  }

  // Most severe and largest first — the list is meant to be acted on top-down.
  const severityRank = { critical: 0, warning: 1, info: 2 }
  return anomalies.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.amount - a.amount
  )
}
