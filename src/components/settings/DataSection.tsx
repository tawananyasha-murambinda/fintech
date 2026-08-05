'use client'

import { useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function DataSection() {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Export failed. Please try again.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded.')
    } catch {
      setMessage('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setMessage('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage('Your account and all associated data are being deleted.')
      } else {
        setMessage(data.error || 'Deletion failed. Please try again.')
      }
    } catch {
      setMessage('Deletion failed. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SettingsCard
      title="Data Privacy"
      description="Download a copy of your data or permanently delete your account."
    >
      {message && (
        <div
          className={`text-sm px-4 py-3 rounded-lg ${
            message.includes('failed') || message.includes('Deletion')
              ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900/40'
              : 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40'
          }`}
        >
          {message}
        </div>
      )}

      <SettingsRow
        label="Export my data"
        description="Download a complete JSON copy of your profile, transactions, budgets, goals, and settings. Passwords and tokens are excluded."
      >
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary text-xs disabled:opacity-50"
        >
          {exporting ? 'Preparing…' : 'Export data'}
        </button>
      </SettingsRow>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</h3>
        <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
          Permanently removes your account, linked banks, transactions, budgets, and insights. This
          cannot be undone. We recommend exporting your data first.
        </p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="mt-3 text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors dark:border-red-900/40 dark:hover:bg-red-950/40"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="input sm:w-64"
              placeholder="DELETE"
              autoComplete="off"
            />
            {password && (
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input sm:w-64"
                placeholder="Current password"
                autoComplete="current-password"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== 'DELETE'}
                className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  )
}
