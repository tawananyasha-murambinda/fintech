import { useEffect, useState } from 'react'
import { CurrencyCode, formatCurrency, formatCurrencyShort, getCurrency } from '@/lib/currency'

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD')

  useEffect(() => {
    setCurrency(getCurrency())

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
    format: (amount: number) => formatCurrency(amount, currency),
    formatShort: (amount: number) => formatCurrencyShort(amount, currency),
  }
}
