'use client'

import { useState } from 'react'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { SyncButton } from '@/components/ui/SyncButton'
import { GradientHeader } from '@/components/layout/GradientHeader'

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface MobileAccountsProps {
  banks: LinkedBank[]
  loading: boolean
  onUnlink: (id: string) => void
}

export function MobileAccounts({ banks, loading, onUnlink }: MobileAccountsProps) {
  const [showSecurity, setShowSecurity] = useState(false)

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-2">
      <GradientHeader
        title="Cards & accounts"
        subtitle={`${banks.length} linked`}
        action={
          <div className="flex gap-2">
            <SyncButton />
            <LinkBankButton />
          </div>
        }
      />

      {banks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-white dark:text-slate-900">
                <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M4 10h20" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Link your first account</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Connect a bank account to start tracking your finances.</p>
            <LinkBankButton />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {banks.map(bank => (
            <div
              key={bank.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-slate-500 dark:text-slate-400">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {bank.institutionName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {bank.accountName} · {bank.accountType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onUnlink(bank.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded shrink-0 ml-2"
                >
                  Unlink
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                <p className="text-xs text-slate-400">
                  {bank.lastSynced ? `Updated ${timeAgo(bank.lastSynced)}` : 'Not synced'}
                </p>
                <span className="text-2xs font-medium text-slate-400 dark:text-slate-500">{bank.currency}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security notice */}
      <button
        onClick={() => setShowSecurity(!showSecurity)}
        className="flex items-center gap-2 mt-4 text-xs text-slate-400"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-teal-600">
          <path d="M8 1.5L2 4v4c0 3.31 2.69 6 6 6s6-2.69 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Security
      </button>
      {showSecurity && (
        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 leading-relaxed animate-fade-up">
          Bank connections are read-only via Plaid open banking. We never see your credentials,
          store your account numbers, or initiate transactions. Access tokens are encrypted at rest.
        </div>
      )}
    </div>
  )
}
