import { NextResponse } from 'next/server'

// Static fallback rates relative to USD (approximate). Used when the live
// provider is unavailable so the app always has something to convert with.
const FALLBACK_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 156,
}

const SUPPORTED = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

// In-memory cache (per server instance) to avoid hammering the provider.
let cache: { rates: Record<string, number>; at: number; source: string } | null = null
const TTL = 6 * 60 * 60 * 1000 // 6 hours

async function fetchLive(): Promise<Record<string, number> | null> {
  try {
    // Free, no-key provider. Base USD.
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      // Revalidate on the edge too.
      next: { revalidate: 60 * 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = data?.rates
    if (!raw) return null
    const rates: Record<string, number> = {}
    for (const code of SUPPORTED) {
      if (typeof raw[code] === 'number') rates[code] = raw[code]
    }
    // Require at least USD + one other to consider it valid.
    if (Object.keys(rates).length < 2) return null
    rates.USD = 1
    return rates
  } catch {
    return null
  }
}

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.at < TTL) {
    return NextResponse.json({ base: 'USD', rates: cache.rates, source: cache.source, cached: true })
  }

  const live = await fetchLive()
  const rates = live || FALLBACK_USD
  const source = live ? 'live' : 'fallback'
  cache = { rates, at: now, source }

  return NextResponse.json({ base: 'USD', rates, source, cached: false })
}
