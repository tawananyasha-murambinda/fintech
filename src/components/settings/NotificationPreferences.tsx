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

  useEffect(() => {
    setMounted(true)
    setPushEnabled(localStorage.getItem('notif_push') === 'true')
    setEmailEnabled(localStorage.getItem('notif_email') !== 'false')
    setNotifyBills(localStorage.getItem('notif_bills') !== 'false')
    setNotifyGoals(localStorage.getItem('notif_goals') !== 'false')
    setNotifyAlerts(localStorage.getItem('notif_alerts') !== 'false')
  }, [])

  function save(key: string, value: boolean) {
    localStorage.setItem(key, String(value))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
      {saved && (
        <div className="text-sm px-4 py-3 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40">
          Preferences saved
        </div>
      )}

      <SettingsRow label="Email notifications" description="Receive notification emails for important updates.">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={e => { setEmailEnabled(e.target.checked); save('notif_email', e.target.checked) }}
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
            onChange={e => { setPushEnabled(e.target.checked); save('notif_push', e.target.checked) }}
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
              onChange={e => { setNotifyBills(e.target.checked); save('notif_bills', e.target.checked) }}
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
              onChange={e => { setNotifyGoals(e.target.checked); save('notif_goals', e.target.checked) }}
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
              onChange={e => { setNotifyAlerts(e.target.checked); save('notif_alerts', e.target.checked) }}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </label>
        </div>
      </div>
    </SettingsCard>
  )
}
