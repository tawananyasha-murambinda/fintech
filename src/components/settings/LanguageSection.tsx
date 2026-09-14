'use client'

import { useEffect, useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { useTranslation } from '@/hooks/useTranslation'
import { LOCALES, LOCALE_NAMES, isLocale, type Locale } from '@/lib/i18n'

export function LanguageSection() {
  const { t, locale, setLocale } = useTranslation()
  const [saved, setSaved] = useState(false)

  // The account is the source of truth across devices, so a stored preference
  // from another browser wins over whatever this one detected.
  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isLocale(data?.locale) && data.locale !== locale) setLocale(data.locale)
      })
      .catch(() => undefined)
    // Deliberately once on mount: this syncs the stored choice, and re-running
    // it whenever the locale changes would fight the user's own selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(next: Locale) {
    setLocale(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SettingsCard title={t('settings', 'language')} description={t('settings', 'languageDescription')}>
      <SettingsRow
        label={LOCALE_NAMES[locale]}
        description={saved ? t('common', 'save') : undefined}
      >
        <div className="flex flex-wrap gap-2 justify-end">
          {LOCALES.map((code) => {
            const active = code === locale
            return (
              <button
                key={code}
                type="button"
                onClick={() => choose(code)}
                aria-pressed={active}
                className="rounded-xl px-3 py-2 text-sm font-medium border transition-colors"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--line)',
                  background: active ? 'var(--accent-wash)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-muted)',
                }}
              >
                {/* The language's own name, never translated — someone looking
                    for Dutch is looking for "Nederlands", not "Dutch". */}
                {LOCALE_NAMES[code]}
              </button>
            )
          })}
        </div>
      </SettingsRow>
    </SettingsCard>
  )
}
