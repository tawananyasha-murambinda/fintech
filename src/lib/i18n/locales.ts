// Locale selection.
//
// Mirrors how the currency preference already works — localStorage for instant
// switching, a custom event so every mounted component re-renders, and the
// user row as the source of truth across devices.
//
// Deliberately not routed (`/nl/dashboard`): this is an authenticated app where
// language is a personal setting, not something to be linked to or indexed, and
// a routed locale would mean restructuring every page for no gain.

export const LOCALES = ['en', 'nl', 'es'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  es: 'Español',
}

/** BCP 47 tags for Intl — dates, numbers and currency formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-GB',
  nl: 'nl-NL',
  es: 'es-ES',
}

const STORAGE_KEY = 'fintrack.locale'

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/**
 * Best guess from the browser, used only when the user has expressed no
 * preference. `navigator.languages` is ordered by preference, so the first
 * entry we support wins.
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE

  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.split('-')[0]?.toLowerCase()
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Private browsing, or storage disabled. Fall through to detection.
  }
  return detectLocale()
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not fatal — the event below still switches the current session.
  }

  // Keeps screen readers and browser features (hyphenation, spellcheck,
  // "translate this page") in step with what is actually rendered.
  document.documentElement.lang = LOCALE_TAGS[locale]

  window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }))
}
