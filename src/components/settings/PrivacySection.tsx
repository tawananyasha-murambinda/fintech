'use client'

import { useEffect, useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function PrivacySection() {
  const [analytics, setAnalytics] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [shareUsage, setShareUsage] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAnalytics(localStorage.getItem('privacy_analytics') !== 'false')
    setAutoSync(localStorage.getItem('privacy_autosync') !== 'false')
    setShareUsage(localStorage.getItem('privacy_share_usage') === 'true')
  }, [])

  function setPref(key: string, value: boolean) {
    localStorage.setItem(key, String(value))
  }

  if (!mounted) {
    return (
      <SettingsCard title="Privacy" description="Control your data and privacy preferences.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard title="Privacy" description="Control your data and privacy preferences.">
      <SettingsRow
        label="Product analytics"
        description="Help improve FinTrack by sharing anonymous usage data."
      >
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={analytics}
            onChange={e => { setAnalytics(e.target.checked); setPref('privacy_analytics', e.target.checked) }}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </SettingsRow>

      <SettingsRow
        label="Auto-sync transactions"
        description="Automatically refresh transactions when you open the dashboard."
      >
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={e => { setAutoSync(e.target.checked); setPref('privacy_autosync', e.target.checked) }}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </SettingsRow>

      <SettingsRow
        label="Usage sharing"
        description="Share feature usage with our team to prioritize improvements."
      >
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shareUsage}
            onChange={e => { setShareUsage(e.target.checked); setPref('privacy_share_usage', e.target.checked) }}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </SettingsRow>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
          We do not sell your data. Your financial information is stored securely and only used
          to provide FinTrack services. Read our Privacy Policy for more details.
        </p>
      </div>
    </SettingsCard>
  )
}
