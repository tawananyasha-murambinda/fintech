import { describe, it, expect } from 'vitest'
import { translate, formatDate, formatNumber, plural, DICTIONARIES, LOCALES } from '../i18n'
import { en } from '../i18n/dictionaries/en'

describe('dictionaries', () => {
  it('covers every key in every language', () => {
    // The type system enforces this at build time; the test catches a key
    // added to English and left untranslated after a merge.
    for (const locale of LOCALES) {
      for (const section of Object.keys(en) as (keyof typeof en)[]) {
        for (const key of Object.keys(en[section])) {
          const value = (DICTIONARIES[locale] as any)[section]?.[key]
          expect(value, `${locale}.${section}.${key}`).toBeTruthy()
        }
      }
    }
  })

  it('actually translates rather than copying English', () => {
    // Guards against a language file that was stubbed out with English.
    const sample = ['nav', 'common', 'dashboard'] as const
    for (const locale of ['nl', 'es'] as const) {
      let differences = 0
      for (const section of sample) {
        for (const key of Object.keys(en[section])) {
          if ((DICTIONARIES[locale] as any)[section][key] !== (en[section] as any)[key]) {
            differences++
          }
        }
      }
      expect(differences, locale).toBeGreaterThan(10)
    }
  })

  it('keeps every placeholder that English uses', () => {
    // A dropped {count} silently renders a sentence with a hole in it.
    for (const locale of LOCALES) {
      for (const section of Object.keys(en) as (keyof typeof en)[]) {
        for (const [key, value] of Object.entries(en[section])) {
          const expected = String(value).match(/\{\w+\}/g) ?? []
          const actual = String((DICTIONARIES[locale] as any)[section][key]).match(/\{\w+\}/g) ?? []
          expect(new Set(actual), `${locale}.${section}.${key}`).toEqual(new Set(expected))
        }
      }
    }
  })
})

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('en', 'nav', 'home')).toBe('Home')
    expect(translate('nl', 'nav', 'home')).toBe('Start')
    expect(translate('es', 'nav', 'home')).toBe('Inicio')
  })

  it('substitutes placeholders', () => {
    expect(translate('en', 'dashboard', 'accountsCount', { count: 3 })).toBe('3 accounts')
    expect(translate('nl', 'dashboard', 'accountsCount', { count: 3 })).toBe('3 rekeningen')
    expect(translate('es', 'dashboard', 'accountsCount', { count: 3 })).toBe('3 cuentas')
  })

  it('leaves an unknown placeholder intact rather than blanking it', () => {
    expect(translate('en', 'dashboard', 'accountsCount', { wrong: 1 })).toContain('{count}')
  })

  it('falls back to English for an unknown locale instead of showing a key', () => {
    expect(translate('de' as any, 'nav', 'home')).toBe('Home')
  })
})

describe('locale-aware formatting', () => {
  it('formats dates in the language, not the browser default', () => {
    const date = new Date('2026-03-15T12:00:00Z')
    const nl = formatDate('nl', date, { day: 'numeric', month: 'long' })
    const es = formatDate('es', date, { day: 'numeric', month: 'long' })

    expect(nl.toLowerCase()).toContain('maart')
    expect(es.toLowerCase()).toContain('marzo')
  })

  it('uses the right decimal separator', () => {
    // Dutch and Spanish use a comma; getting this wrong misreads money.
    expect(formatNumber('en', 1234.5)).toContain('.')
    expect(formatNumber('nl', 1234.5)).toContain(',')
    expect(formatNumber('es', 1234.5)).toContain(',')
  })

  it('returns empty for an invalid date rather than "Invalid Date"', () => {
    expect(formatDate('en', 'not-a-date')).toBe('')
  })
})

describe('plural', () => {
  it('selects singular and plural forms', () => {
    expect(plural('en', 1, 'day', 'days')).toBe('day')
    expect(plural('en', 2, 'day', 'days')).toBe('days')
    expect(plural('nl', 1, 'dag', 'dagen')).toBe('dag')
    expect(plural('es', 0, 'día', 'días')).toBe('días')
  })
})

describe('server-composed messages', () => {
  it('formats money in the language and the account currency', async () => {
    const { formatMoney } = await import('../i18n')

    // These are built by the nightly job and stored. They previously carried a
    // hard-coded "$", so a euro account was told it had overspent in dollars.
    expect(formatMoney('en', 'GBP', 1234)).toContain('£')
    expect(formatMoney('nl', 'EUR', 1234)).toContain('€')
    expect(formatMoney('es', 'EUR', 1234)).toContain('€')
    expect(formatMoney('en', 'USD', 1234)).toContain('$')
  })

  it('survives an unrecognised currency rather than failing the job', async () => {
    const { formatMoney } = await import('../i18n')
    expect(formatMoney('en', 'NOTACURRENCY', 12)).toBe('12')
  })

  it('renders an alert in each language', async () => {
    const { translate } = await import('../i18n')
    const vars = { category: 'Groceries' }

    expect(translate('en', 'alerts', 'budgetExceededTitle', vars)).toContain('Budget exceeded')
    expect(translate('nl', 'alerts', 'budgetExceededTitle', vars)).toContain('Budget overschreden')
    expect(translate('es', 'alerts', 'budgetExceededTitle', vars)).toContain('Presupuesto superado')
  })

  it('renders an anomaly message with every value filled in', async () => {
    const { translate } = await import('../i18n')

    for (const locale of ['en', 'nl', 'es'] as const) {
      const text = translate(locale, 'anomalies', 'duplicateMessage', {
        merchant: 'Tesco',
        amount: '£42.00',
        count: 2,
      })
      expect(text).toContain('Tesco')
      expect(text).toContain('£42.00')
      // No placeholder may survive into text a user reads.
      expect(text).not.toMatch(/\{\w+\}/)
    }
  })
})
