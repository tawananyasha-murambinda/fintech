'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getLocale,
  setLocale as persistLocale,
  translate,
  formatDate,
  formatNumber,
  type Dictionary,
  type Locale,
} from '@/lib/i18n'

/**
 * Translation for client components.
 *
 * Follows the same shape as useCurrency: read the stored preference on mount,
 * then re-render on the custom event so a language change takes effect
 * everywhere at once without a reload.
 */
export function useTranslation() {
  // Starts at the default and corrects after mount: reading localStorage
  // during render would make the server and client markup disagree.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    setLocaleState(getLocale())

    const handle = () => setLocaleState(getLocale())
    window.addEventListener('locale-change', handle)
    window.addEventListener('storage', handle)
    return () => {
      window.removeEventListener('locale-change', handle)
      window.removeEventListener('storage', handle)
    }
  }, [])

  const t = useCallback(
    <S extends keyof Dictionary>(
      section: S,
      key: keyof Dictionary[S],
      vars?: Record<string, string | number>
    ) => translate(locale, section, key, vars),
    [locale]
  )

  const changeLocale = useCallback((next: Locale) => {
    persistLocale(next)

    // Saved to the account as well, so the choice follows to another device.
    // Best-effort: the change has already taken effect locally.
    // PUT, not PATCH: that is what the profile route exports and what every
    // other caller uses. Sending PATCH returned 405 and the choice was never
    // saved to the account, so it silently failed to follow to another device.
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined)
  }, [])

  return {
    t,
    locale,
    setLocale: changeLocale,
    formatDate: useCallback(
      (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
        formatDate(locale, date, options),
      [locale]
    ),
    formatNumber: useCallback(
      (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
      [locale]
    ),
  }
}
