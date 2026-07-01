import { useEffect, useState } from 'react'
import {
  CurrencyCode,
  formatCurrency,
  formatCurrencyShort,
  getCurrency,
  convert,
  setRates,
} from '@/lib/currency'

// Module-level guard so we only fetch rates once per session, shared across
// every component using the hook.
let ratesLoaded = false
let ratesPromise: Promise<void> | null = null

function ensureRates(onLoaded: () => void) {
  if (ratesLoaded) { onLoaded(); return }
  if (!ratesPromise) {
    ratesPromise = fetch('/api/rates')
      .then((r) => r.json())
      .then((d) => { if (d?.rates) setRates(d.rates); ratesLoaded = true })
      .catch(() => { ratesLoaded = true })
  }
  ratesPromise.then(onLoaded)
}

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [, force] = useState(0)

  useEffect(() => {
    setCurrency(getCurrency())
    ensureRates(() => force((n) => n + 1))

    function handleChange() {
      setCurrency(getCurrency())
    }

    window.addEventListener('currency-change', handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener('currency-change', handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  return {
    currency,
    // Format an amount already in the user's currency.
    format: (amount: number) => formatCurrency(amount, currency),
    formatShort: (amount: number) => formatCurrencyShort(amount, currency),
    // Convert an amount from its source currency into the user's currency, then format.
    convertFormat: (amount: number, from?: string | null) =>
      formatCurrency(convert(amount, from, currency), currency),
    convertFormatShort: (amount: number, from?: string | null) =>
      formatCurrencyShort(convert(amount, from, currency), currency),
    // Raw converted number (for splitAmount / balance display).
    toDisplay: (amount: number, from?: string | null) => convert(amount, from, currency),
  }
}
