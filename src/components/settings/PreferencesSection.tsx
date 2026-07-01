'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function PreferencesSection() {
  const { theme, setTheme } = useTheme()
  const [currency, setCurrency] = useState('USD')
  const [compactMode, setCompactMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrency(localStorage.getItem('currency') || 'USD')
    setCompactMode(localStorage.getItem('compactMode') === 'true')
    // Sync from the server so the AI assistant and this UI agree.
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        const c = d?.user?.currency
        if (c) {
          setCurrency(c)
          if (localStorage.getItem('currency') !== c) {
            localStorage.setItem('currency', c)
            window.dispatchEvent(new Event('currency-change'))
          }
        }
      })
      .catch(() => {})
  }, [])

  function updateCurrency(value: string) {
    setCurrency(value)
    localStorage.setItem('currency', value)
    window.dispatchEvent(new Event('currency-change'))
    // Persist to the account so server-side features (AI assistant, insights)
    // use the same currency.
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: value }),
    }).catch(() => {})
  }

  function updateCompactMode(value: boolean) {
    setCompactMode(value)
    localStorage.setItem('compactMode', String(value))
    window.dispatchEvent(new StorageEvent('storage', { key: 'compactMode', newValue: String(value) }))
  }

  if (!mounted) {
    return (
      <SettingsCard title="Preferences" description="Customize how FinTrack looks and feels.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard title="Preferences" description="Customize how FinTrack looks and feels.">
      <SettingsRow label="Theme" description="Choose your preferred appearance.">
        <select
          value={theme}
          onChange={e => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="input sm:w-48"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </SettingsRow>

      <SettingsRow label="Currency" description="Default currency for display.">
        <select
          value={currency}
          onChange={e => updateCurrency(e.target.value)}
          className="input sm:w-48"
        >
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CAD">CAD (C$)</option>
          <option value="AUD">AUD (A$)</option>
          <option value="JPY">JPY (¥)</option>
        </select>
      </SettingsRow>

      <SettingsRow label="Compact mode" description="Reduce spacing and font sizes in tables.">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={e => updateCompactMode(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enable</span>
        </label>
      </SettingsRow>
    </SettingsCard>
  )
}
