'use client'

import { useState, useEffect } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function NotificationPreferencesSection() {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [notifyBills, setNotifyBills] = useState(true)
  const [notifyGoals, setNotifyGoals] = useState(true)
  const [notifyAlerts, setNotifyAlerts] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)

  const [error, setError] = useState('')

  // Read from the account, not localStorage. The nightly job that sends these
  // notifications runs on the server and cannot see a browser — so a mute kept
  // only in localStorage silenced nothing at all.
  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setPushEnabled(data.notifyPush ?? true)
        setEmailEnabled(data.notifyEmail ?? true)
        setNotifyBills(data.notifyBills ?? true)
        setNotifyGoals(data.notifyGoals ?? true)
        setNotifyAlerts(data.notifyAlerts ?? true)
      })
      .catch(() => undefined)
      .finally(() => setMounted(true))
  }, [])

  async function save(key: string, value: boolean) {
    setError('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('Could not save that preference.')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      // Say so rather than showing "saved" for something that was not.
      setError(err instanceof Error ? err.message : 'Could not save that preference.')
    }
  }

  if (!mounted) {
    return (
      <SettingsCard title="Notifications" description="Control what notifications you receive.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard title="Notifications" description="Control what notifications you receive.">
      {error && (
        <div role="alert" className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="text-sm px-4 py-3 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40">
          Preferences saved
        </div>
      )}

      <SettingsRow label="Email notifications" description="Receive notification emails for important updates.">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={e => { setEmailEnabled(e.target.checked); save('notifyEmail', e.target.checked) }}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{emailEnabled ? 'On' : 'Off'}</span>
        </label>
      </SettingsRow>

      <SettingsRow label="Push notifications" description="Get notifications on your device (browser or mobile app).">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={e => { setPushEnabled(e.target.checked); save('notifyPush', e.target.checked) }}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{pushEnabled ? 'On' : 'Off'}</span>
        </label>
      </SettingsRow>

      <div className="border-t border-slate-100 pt-4 mt-4 dark:border-slate-800">
        <h4 className="text-xs font-semibold text-slate-700 mb-3 dark:text-slate-300">Notification types</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Bill reminders</p>
              <p className="text-2xs text-slate-400">Upcoming and overdue bills</p>
            </div>
            <input
              type="checkbox"
              checked={notifyBills}
              onChange={e => { setNotifyBills(e.target.checked); save('notifyBills', e.target.checked) }}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Goal milestones</p>
              <p className="text-2xs text-slate-400">Progress updates and goal achievements</p>
            </div>
            <input
              type="checkbox"
              checked={notifyGoals}
              onChange={e => { setNotifyGoals(e.target.checked); save('notifyGoals', e.target.checked) }}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Budget alerts</p>
              <p className="text-2xs text-slate-400">Overspending and unusual charges</p>
            </div>
            <input
              type="checkbox"
              checked={notifyAlerts}
              onChange={e => { setNotifyAlerts(e.target.checked); save('notifyAlerts', e.target.checked) }}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </label>
        </div>
      </div>
    </SettingsCard>
  )
}
