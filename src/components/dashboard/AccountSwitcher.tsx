'use client'

import { useState, useEffect } from 'react'

interface Account {
  id: string
  institutionName: string
  accountType: string
  accountName: string
  currency: string
  lastSynced: string | null
}

interface AccountSwitcherProps {
  selectedAccountId: string | null
  onSelect: (accountId: string | null) => void
}

export function AccountSwitcher({ selectedAccountId, onSelect }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plaid/accounts')
      .then(r => r.json())
      .then(data => {
        setAccounts(data.banks || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null
  if (accounts.length === 0) return null

  return (
    <div className="overflow-x-auto -mx-4 lg:mx-0 px-4 lg:px-0 pb-2">
      <div className="flex gap-3 min-w-max lg:flex-wrap">
        <button
          onClick={() => onSelect(null)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm transition-all duration-100 shrink-0 ${
            selectedAccountId === null
              ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:border-teal-500 dark:text-teal-300'
              : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          <span className="font-medium">All accounts</span>
        </button>

        {accounts.map((acct) => (
          <button
            key={acct.id}
            onClick={() => onSelect(acct.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm transition-all duration-100 shrink-0 ${
              selectedAccountId === acct.id
                ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:border-teal-500 dark:text-teal-300'
                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
              selectedAccountId === acct.id
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {acct.institutionName[0]}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium">{acct.accountName || acct.institutionName}</p>
              <p className="text-2xs text-slate-400 dark:text-slate-500">{acct.accountType}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
