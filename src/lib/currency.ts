export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY'

export const currencySymbols: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
}

// Locale for each currency, so symbol placement and grouping/decimal
// separators follow the real convention (€3,021 · 3.021 € · £3,021 · $3,021).
const currencyLocales: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE', // euro-style: 3.021 with symbol trailing
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
}

// Split an amount for the large balance display. Cents are dropped when the
// amount is whole; the symbol lands before or after the number per locale.
export function splitAmount(amount: number, currency?: CurrencyCode) {
  const code = currency || getCurrency()
  const locale = currencyLocales[code] || 'en-US'
  const noCents = code === 'JPY'
  const abs = Math.abs(amount)
  const isWhole = Math.abs(abs - Math.round(abs)) < 0.005
  const showCents = !noCents && !isWhole

  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).formatToParts(abs)

  let symbol = ''
  let intStr = ''
  let cents = ''
  let decimal = '.'
  let symbolLeading = true
  let seenNumber = false

  for (const part of parts) {
    switch (part.type) {
      case 'currency':
        symbol = part.value
        if (seenNumber) symbolLeading = false
        break
      case 'integer':
      case 'group':
        intStr += part.value
        seenNumber = true
        break
      case 'decimal':
        decimal = part.value
        break
      case 'fraction':
        cents = part.value
        seenNumber = true
        break
    }
  }

  return {
    sign: amount < 0 ? '-' : '',
    symbol,
    symbolLeading,
    int: intStr,
    cents,
    decimal,
    hasCents: showCents && cents !== '',
  }
}

export function getCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD'
  return (localStorage.getItem('currency') as CurrencyCode) || 'USD'
}

// ── FX conversion (display layer) ──────────────────────────────────
// Rates are relative to USD. Amounts are stored in their original currency;
// we convert for display into the user's chosen currency.
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52, JPY: 156,
}

let RATES: Record<string, number> = { ...FALLBACK_USD_RATES }

export function setRates(rates: Record<string, number>) {
  RATES = { ...FALLBACK_USD_RATES, ...rates, USD: 1 }
}

export function getRates(): Record<string, number> {
  return RATES
}

// Convert an amount from one currency to another using USD-based rates.
export function convert(amount: number, from?: CurrencyCode | string | null, to?: CurrencyCode | string | null): number {
  const f = (from || 'USD') as string
  const t = (to || getCurrency()) as string
  if (f === t) return amount
  const rf = RATES[f] ?? 1 // units of `from` per USD
  const rt = RATES[t] ?? 1 // units of `to` per USD
  if (!rf) return amount
  const usd = amount / rf
  return usd * rt
}

export function formatCurrency(amount: number, currency?: CurrencyCode): string {
  const code = currency || getCurrency()
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: code === 'JPY' ? 0 : 2,
  }).format(amount)
}

export function formatCurrencyShort(amount: number, currency?: CurrencyCode): string {
  const code = currency || getCurrency()
  const symbol = currencySymbols[code]
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${symbol}${(abs / 1_000).toFixed(1)}k`
  return `${symbol}${abs.toFixed(0)}`
}
