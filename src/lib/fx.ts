import { convert, setRates } from '@/lib/currency'
import { logger } from '@/lib/logger'

// Server-side exchange rates.
//
// Safe-to-spend and net worth were adding balances across currencies with no
// conversion at all — a €500 account plus a £500 account came out as 1000 of
// whatever the display currency happened to be. That was surfaced as a caveat,
// which is honest but still wrong.
//
// Rates are cached in module memory for an hour: they move slowly, and a
// serverless instance that fetched them once should not fetch them again for
// every request it serves.

const CACHE_MS = 60 * 60 * 1000
const RATES_URL = 'https://open.er-api.com/v6/latest/USD'

let cachedAt = 0
let inFlight: Promise<void> | null = null
/** False until a live fetch has succeeded, so callers can say the figure is approximate. */
let usingLiveRates = false

async function refresh(): Promise<void> {
  try {
    const res = await fetch(RATES_URL, {
      signal: AbortSignal.timeout(5000),
      // Rates change daily; letting the platform cache them is fine and saves
      // a round trip on a cold start.
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`rates responded ${res.status}`)

    const data = await res.json()
    if (data?.rates && typeof data.rates === 'object') {
      setRates(data.rates)
      usingLiveRates = true
      cachedAt = Date.now()
      return
    }
    throw new Error('rates payload had no rates')
  } catch (err) {
    // The built-in fallback table stays in place, so conversion still happens —
    // just against figures that may be months old. Worth logging, not worth
    // failing a request over.
    logger.warn('Live FX rates unavailable, using fallback table', {
      error: err instanceof Error ? err.message : String(err),
    })
    cachedAt = Date.now()
  }
}

export async function ensureRates(): Promise<void> {
  if (Date.now() - cachedAt < CACHE_MS) return
  // Concurrent callers share one fetch rather than each starting their own.
  if (!inFlight) inFlight = refresh().finally(() => { inFlight = null })
  await inFlight
}

export function ratesAreLive(): boolean {
  return usingLiveRates
}

/**
 * Sums amounts that may be in different currencies into one.
 *
 * Returns whether any conversion was needed, so the caller can tell the user
 * the total crosses currencies rather than presenting it as exact.
 */
export async function sumInCurrency(
  items: { amount: number; currency: string }[],
  target: string
): Promise<{ total: number; converted: boolean; live: boolean }> {
  if (items.length === 0) return { total: 0, converted: false, live: ratesAreLive() }

  const mixed = items.some((i) => i.currency !== target)
  if (mixed) await ensureRates()

  const total = items.reduce(
    (sum, item) =>
      sum + (item.currency === target ? item.amount : convert(item.amount, item.currency, target)),
    0
  )

  return {
    total: Math.round(total * 100) / 100,
    converted: mixed,
    live: mixed ? ratesAreLive() : true,
  }
}
