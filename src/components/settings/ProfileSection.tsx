'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useProfile } from '@/hooks/useProfile'
import { SettingsCard, SettingsRow } from './SettingsCard'

export function ProfileSection() {
  const { data: session, update } = useSession()
  const { profile, loading } = useProfile()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  // Keep local form state in sync with fetched profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setEmail(profile.email || '')
    }
  }, [profile])

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        await update({ name: data.user.name })
        setMessage('Profile updated.')
      } else {
        setMessage(data.error || 'Failed to update profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.hasPassword) {
      setMessage('Email cannot be changed for OAuth-only accounts.')
      return
    }
    if (email === profile?.email) {
      setMessage('New email must be different.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: email, password: emailPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        await update({ email: data.email })
        setEmailPassword('')
        setMessage('Email updated. You may need to sign in again.')
      } else {
        setMessage(data.error || 'Failed to change email.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SettingsCard title="Profile" description="Manage your public profile information.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    || profile?.email?.[0].toUpperCase()
    || '?'

  return (
    <SettingsCard title="Profile" description="Manage your public profile information.">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.includes('updated') ? 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900/40' : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900/40'}`}>
          {message}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-semibold shrink-0 dark:bg-teal-950 dark:text-teal-300">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile?.name || 'Account'}</p>
          <p className="text-xs text-slate-400">{profile?.email || session?.user?.email}</p>
          <p className="text-2xs text-slate-400 mt-0.5 dark:text-slate-500">
            Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdateName} className="space-y-4">
        <SettingsRow label="Display name" description="This is how your name appears across the app.">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input sm:w-64"
            placeholder="Your name"
            required
            minLength={1}
            maxLength={100}
          />
        </SettingsRow>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || name === profile?.name}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </form>

      <form onSubmit={handleChangeEmail} className="space-y-4">
        <SettingsRow
          label="Email address"
          description={profile?.hasPassword
            ? 'Change the email you use to sign in.'
            : 'OAuth accounts cannot change email here.'}
        >
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input sm:w-64"
            placeholder="you@example.com"
            required
            disabled={!profile?.hasPassword}
          />
        </SettingsRow>
        {profile?.hasPassword && email !== profile?.email && (
          <SettingsRow label="Confirm password" description="Enter your current password to change email.">
            <input
              type="password"
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              className="input sm:w-64"
              placeholder="Current password"
              required
              minLength={8}
            />
          </SettingsRow>
        )}
        {profile?.hasPassword && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || email === profile?.email}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Change email'}
            </button>
          </div>
        )}
      </form>
    </SettingsCard>
  )
}
