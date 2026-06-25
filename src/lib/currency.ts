export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY'

const currencySymbols: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
}

export function getCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD'
  return (localStorage.getItem('currency') as CurrencyCode) || 'USD'
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
