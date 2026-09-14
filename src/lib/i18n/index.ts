import { en, type Dictionary } from './dictionaries/en'
import { nl } from './dictionaries/nl'
import { es } from './dictionaries/es'
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from './locales'

export * from './locales'
export type { Dictionary }

export const DICTIONARIES: Record<Locale, Dictionary> = { en, nl, es }

type Section = keyof Dictionary
type Key<S extends Section> = keyof Dictionary[S]

/**
 * Looks up a string and fills its placeholders.
 *
 * The English dictionary is the fallback for a key that somehow resolves to
 * nothing at runtime — better a readable English string than an exposed key
 * like "dashboard.balance" in front of a user.
 */
export function translate<S extends Section>(
  locale: Locale,
  section: S,
  key: Key<S>,
  vars?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
  const template =
    (dict[section]?.[key] as string | undefined) ??
    (DICTIONARIES[DEFAULT_LOCALE][section]?.[key] as string | undefined) ??
    String(key)

  if (!vars) return template

  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  )
}

/**
 * Money formatted for a language and currency together.
 *
 * Server-side counterpart to the useCurrency hook, for text composed outside
 * React — alerts and push notifications are built by the nightly job. Those
 * messages previously hard-coded a "$", so a euro account was told it had
 * overspent in dollars.
 */
export function formatMoney(locale: Locale, currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // An unrecognised currency code must not take down the whole job.
    return `${Math.round(amount)}`
  }
}

/** Date formatting in the user's language rather than the browser's. */
export function formatDate(
  locale: Locale,
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  const value = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(value)
}

export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(value)
}

/**
 * Picks the singular or plural form.
 *
 * All three languages here share the same one-vs-many rule, so a full
 * plural-rules engine would be weight for nothing. Intl.PluralRules is used
 * anyway so adding a language with different rules does not silently break.
 */
export function plural(locale: Locale, count: number, one: string, other: string): string {
  const rule = new Intl.PluralRules(LOCALE_TAGS[locale]).select(count)
  return rule === 'one' ? one : other
}
