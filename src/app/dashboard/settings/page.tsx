'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This is permanent and cannot be undone.')) return
    setDeleting(true)
    const res = await fetch('/api/accounts/me', { method: 'DELETE' })
    if (res.ok) signOut({ callbackUrl: '/' })
    else setDeleting(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-semibold">
            {session?.user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{session?.user?.name}</p>
            <p className="text-xs text-slate-400">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Security</h2>
        <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
          <p>— Passwords are hashed with bcrypt (cost factor 12)</p>
          <p>— Bank access tokens encrypted with AES-256-GCM</p>
          <p>— Sessions use signed JWT tokens</p>
          <p>— Bank connections are read-only via Teller.io</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-red-100 space-y-3">
        <h2 className="text-sm font-semibold text-red-600">Danger zone</h2>
        <p className="text-xs text-slate-500">
          Deleting your account will permanently remove all linked banks, transactions, and insights.
          This action cannot be reversed.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </div>
  )
}
