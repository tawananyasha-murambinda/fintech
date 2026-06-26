'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useProfile } from '@/hooks/useProfile'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function SecuritySection() {
  const { profile, loading } = useProfile()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (loading) {
    return (
      <SettingsCard title="Security" description="Manage your password and account security.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setMessage('Password changed successfully.')
      } else {
        setMessage(data.error || 'Failed to change password.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This is permanent and cannot be undone.')) return
    setDeleting(true)
    const res = await fetch('/api/accounts/me', { method: 'DELETE' })
    if (res.ok) signOut({ callbackUrl: '/' })
    else setDeleting(false)
  }

  return (
    <SettingsCard
      title="Security"
      description="Manage your password and account security."
      danger={false}
    >
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.includes('successfully') ? 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40' : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900/40'}`}>
          {message}
        </div>
      )}

      {profile?.hasPassword ? (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <SettingsRow label="Current password">
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input sm:w-64"
              placeholder="••••••••"
              required
            />
          </SettingsRow>
          <SettingsRow label="New password" description="Must be at least 8 characters.">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input sm:w-64"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </SettingsRow>
          <SettingsRow label="Confirm new password">
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input sm:w-64"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </SettingsRow>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {saving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3 dark:bg-slate-800 dark:text-slate-400">
          Your account uses OAuth sign-in. Password management is handled by your provider.
        </div>
      )}

      {/* Biometric unlock */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-slate-900 mb-2 dark:text-slate-100">Biometric unlock</h3>
        <p className="text-xs text-slate-500 mb-3 dark:text-slate-400">
          Use Face ID, Touch ID, or fingerprint to unlock the app instead of typing your password every time.
        </p>
        <button
          onClick={async () => {
            try {
              const BiometricPlugin = (window as any).Capacitor?.Plugins?.Biometric
              if (BiometricPlugin) {
                await BiometricPlugin.enable()
                localStorage.setItem('biometric_enabled', 'true')
                return
              }
            } catch {}
            localStorage.setItem('biometric_enabled', localStorage.getItem('biometric_enabled') !== 'true' ? 'true' : '')
          }}
          className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {typeof window !== 'undefined' && localStorage.getItem('biometric_enabled') === 'true'
            ? 'Biometric enabled'
            : 'Enable biometric unlock'}
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-3 dark:border-slate-800">
        <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Danger zone</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deleting your account will permanently remove all linked banks, transactions, and insights.
          This action cannot be reversed.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/40"
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </SettingsCard>
  )
}
