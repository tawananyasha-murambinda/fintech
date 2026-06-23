'use client'

import { useState, useEffect } from 'react'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { SyncButton } from '@/components/ui/SyncButton'

interface LinkedBank {
  id: string
  institutionName: string
  accountType: string
  accountName: string
  currency: string
  lastSynced?: string
  createdAt: string
}

function formatDate(d?: string) {
  if (!d) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function AccountTypeIcon({ type }: { type: string }) {
  return (
    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-500">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function AccountsPage() {
  const [banks, setBanks] = useState<LinkedBank[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/teller/link')
      .then(r => r.json())
      .then(d => { setBanks(d.banks || []); setLoading(false) })
  }, [])

  async function handleUnlink(id: string) {
    if (!confirm('Unlink this account? Transaction history will be retained.')) return
    const res = await fetch(`/api/teller/link/${id}`, { method: 'DELETE' })
    if (res.ok) setBanks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your linked bank accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <SyncButton />
          <LinkBankButton />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : banks.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">No linked accounts</h2>
          <p className="text-sm text-slate-500 mb-5">
            Connect a bank account to start tracking your finances.
          </p>
          <LinkBankButton />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-50">
            {banks.map(bank => (
              <div key={bank.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <AccountTypeIcon type={bank.accountType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {bank.institutionName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {bank.accountName} · {bank.accountType} · {bank.currency}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xs text-slate-400">Last synced</p>
                  <p className="text-xs text-slate-600">{formatDate(bank.lastSynced)}</p>
                </div>
                <button
                  onClick={() => handleUnlink(bank.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-teal-600 shrink-0 mt-0.5">
          <path d="M8 1.5L2 4v4c0 3.31 2.69 6 6 6s6-2.69 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-0.5">Read-only access</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bank connections are read-only via Teller.io open banking. We never see your credentials,
            store your account numbers, or initiate transactions. Access tokens are encrypted at rest using AES-256-GCM.
          </p>
        </div>
      </div>
    </div>
  )
}
