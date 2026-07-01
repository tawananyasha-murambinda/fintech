'use client'

import { useState, useEffect } from 'react'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { MobileAccounts } from '@/components/accounts/MobileAccounts'
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
    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 dark:bg-slate-800">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-500 dark:text-slate-400">
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
    fetch('/api/plaid/accounts')
      .then(r => r.json())
      .then(d => { setBanks(d.banks || []); setLoading(false) })
  }, [])

  async function handleUnlink(id: string) {
    if (!confirm('Unlink this account? Transaction history will be retained.')) return
    const res = await fetch(`/api/plaid/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) setBanks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <>
      {/* Mobile view */}
      <div className="block lg:hidden">
        <MobileAccounts
          banks={banks}
          loading={loading}
          onUnlink={handleUnlink}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block max-w-3xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600 dark:text-blue-400">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Accounts</h1>
              <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
                Manage your linked bank accounts.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <SyncButton />
            <LinkBankButton />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
            <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : banks.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No linked accounts</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
              Connect a bank account to start tracking your finances.
            </p>
            <LinkBankButton />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {banks.map(bank => (
                <div key={bank.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800">
                  <AccountTypeIcon type={bank.accountType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">
                      {bank.institutionName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {bank.accountName} · {bank.accountType} · {bank.currency}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xs text-slate-400 dark:text-slate-500">Last synced</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{formatDate(bank.lastSynced)}</p>
                  </div>
                  <button
                    onClick={() => handleUnlink(bank.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded dark:text-slate-500 dark:hover:text-red-400"
                  >
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security notice */}
        <div className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-teal-600 shrink-0 mt-0.5">
            <path d="M8 1.5L2 4v4c0 3.31 2.69 6 6 6s6-2.69 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-0.5 dark:text-slate-300">Read-only access</p>
            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
              Bank connections are read-only via Plaid open banking. We never see your credentials,
              store your account numbers, or initiate transactions. Access tokens are encrypted at rest using AES-256-GCM.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
