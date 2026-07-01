'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { useCurrency } from '@/hooks/useCurrency'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useHaptics } from '@/hooks/useHaptics'

interface Account {
  id: string
  institutionName: string
  accountType: string
  accountName: string
  currency: string
  lastSynced: string | null
  balance: number
}

interface MobileDashboardProps {
  stats: {
    monthlyIncome: number
    monthlyExpenses: number
    netCashflow: number
    savingsRate: number
    linkedAccounts: number
  }
  categories: { category: string; total: number; percentage: number }[]
  recentTransactions: any[]
  hasData: boolean
  userName: string
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="h-9 w-9 rounded-full" />
      </div>
      <SkeletonBlock className="h-40 rounded-3xl" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-16 rounded-2xl" />)}
      </div>
      <SkeletonBlock className="h-28 rounded-2xl" />
      <SkeletonBlock className="h-56 rounded-2xl" />
    </div>
  )
}

export function MobileDashboard({ stats, categories, recentTransactions, hasData, userName }: MobileDashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const { format: fmt } = useCurrency()
  const router = useRouter()
  const searchParams = useSearchParams()
  const carouselRef = useRef<HTMLDivElement>(null)
  const haptics = useHaptics()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({ description: '', amount: '', direction: 'debit' })
  const [quickAddError, setQuickAddError] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/plaid/accounts')
    const data = await res.json()
    setAccounts(data.banks || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const handleRefresh = useCallback(async () => {
    await fetchAccounts()
    await new Promise((r) => setTimeout(r, 200))
  }, [fetchAccounts])

  const { containerRef, pullDistance, refreshing, pullIndicator } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 70,
  })

  const selectedAccountId = searchParams.get('account')

  function selectAccount(accountId: string | null) {
    haptics.light()
    const params = new URLSearchParams(searchParams.toString())
    if (accountId) params.set('account', accountId)
    else params.delete('account')
    router.push(`/dashboard${params.toString() ? '?' + params.toString() : ''}`)
  }

  const activeAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null
  const balance = activeAccount ? activeAccount.balance : accounts.reduce((s, a) => s + a.balance, 0)

  if (loading) return <DashboardSkeleton />

  const cards = [
    { id: null as string | null, name: 'All accounts', sub: `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`, balance, synced: null as string | null },
    ...accounts.map((a) => ({
      id: a.id,
      name: a.accountName || a.institutionName,
      sub: `${a.accountType} · ${a.currency}`,
      balance: a.balance,
      synced: a.lastSynced,
    })),
  ]

  return (
    <div ref={containerRef} className="flex flex-col min-h-full pb-24">
      {pullIndicator && (
        <div className="flex items-center justify-center py-3 -mt-1">
          {refreshing ? (
            <div className="w-5 h-5 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div
              className="w-5 h-5 text-slate-400 transition-transform duration-200"
              style={{ transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Good to see you</p>
          <p className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{firstName(userName)}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="w-10 h-10 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-sm font-semibold press"
          aria-label="Settings"
        >
          {firstName(userName).charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* No accounts */}
      {accounts.length === 0 && !hasData && (
        <div className="rounded-3xl bg-slate-900 dark:bg-slate-800 text-white p-7 text-center">
          <p className="text-lg font-semibold mb-1.5">Add your first account</p>
          <p className="text-sm text-slate-300 mb-6 max-w-xs mx-auto">
            Connect a bank to see balances and spending in one place.
          </p>
          <LinkBankButton />
        </div>
      )}

      {/* Card carousel */}
      {accounts.length > 0 && (
        <>
          <div className="-mx-4">
            <div
              ref={carouselRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 gap-3 pb-4 snap-scroll"
            >
              {cards.map((c) => {
                const active = c.id === selectedAccountId
                return (
                  <button
                    key={c.id ?? 'all'}
                    onClick={() => selectAccount(c.id)}
                    className={`snap-start shrink-0 w-[300px] rounded-3xl p-5 text-left press ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-800'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                          {c.name}
                        </p>
                        <p className={`text-[12px] ${active ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {c.sub}
                        </p>
                      </div>
                      <svg width="26" height="18" viewBox="0 0 26 18" fill="none" className={active ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600'}>
                        <rect x="0.5" y="0.5" width="25" height="17" rx="3" stroke="currentColor" />
                        <path d="M0.5 5h25" stroke="currentColor" />
                      </svg>
                    </div>
                    <p className={`text-3xl font-semibold stat-number ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {fmt(c.balance)}
                    </p>
                    <p className={`text-[12px] mt-1 ${active ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {c.id === null ? 'Total balance' : c.synced ? `Updated ${timeAgo(c.synced)}` : 'Not synced'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mb-6">
            {cards.map((c) => (
              <span
                key={c.id ?? 'all'}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  c.id === selectedAccountId ? 'w-5 bg-slate-900 dark:bg-white' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <ActionButton onClick={() => { haptics.medium(); setShowQuickAdd(true) }} label="Add" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M11 5v12M5 11h12" /></svg>
            } />
            <ActionButton href="/dashboard/transactions" label="Activity" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h16M3 11h12M3 16h14" /></svg>
            } />
            <ActionButton href="/dashboard/budgets" label="Budgets" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="5" width="14" height="12" rx="2" /><path d="M7 9h8M7 12h6" strokeLinecap="round" /></svg>
            } />
            <ActionButton href="/dashboard/goals" label="Goals" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8" /><circle cx="11" cy="11" r="4.5" /><circle cx="11" cy="11" r="1.5" fill="currentColor" /></svg>
            } />
          </div>

          {/* This month */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">This month</p>
              <p className={`text-sm font-semibold tabular-nums ${
                stats.netCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}>
                {stats.netCashflow >= 0 ? '+' : '−'}{fmt(Math.abs(stats.netCashflow))}
              </p>
            </div>
            <div className="space-y-4">
              <BarRow label="Money in" value={stats.monthlyIncome} max={Math.max(stats.monthlyIncome, stats.monthlyExpenses)} tone="in" />
              <BarRow label="Money out" value={stats.monthlyExpenses} max={Math.max(stats.monthlyIncome, stats.monthlyExpenses)} tone="out" />
            </div>
          </div>

          {/* Recent */}
          {recentTransactions.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-4 py-2 mb-4">
              <div className="flex items-center justify-between px-1 pt-2 pb-1">
                <p className="section-title">Recent activity</p>
                <Link href="/dashboard/transactions" className="text-[13px] text-slate-500 dark:text-slate-400 font-medium press">
                  See all
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </div>
            </div>
          )}

          {/* Spending */}
          {categories.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5">
              <p className="section-title mb-4">Top spending</p>
              <div className="space-y-3">
                {categories.slice(0, 5).map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{cleanLabel(cat.category)}</span>
                      <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">{fmt(cat.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-slate-900 dark:bg-slate-300" style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick-add sheet */}
      <BottomSheet open={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Add transaction">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setQuickAddError('')
            if (!quickAddForm.description || !quickAddForm.amount) {
              haptics.error()
              setQuickAddError('Add a description and amount to continue.')
              return
            }
            setQuickAddSaving(true)
            try {
              const res = await fetch('/api/manual-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  description: quickAddForm.description,
                  amount: parseFloat(quickAddForm.amount),
                  direction: quickAddForm.direction,
                }),
              })
              if (!res.ok) throw new Error('Failed')
              haptics.success()
              setShowQuickAdd(false)
              setQuickAddForm({ description: '', amount: '', direction: 'debit' })
              router.refresh()
            } catch {
              haptics.error()
              setQuickAddError('That did not save. Try again.')
            }
            setQuickAddSaving(false)
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              placeholder="e.g. Coffee shop"
              value={quickAddForm.description}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, description: e.target.value })}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={quickAddForm.amount}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, amount: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickAddForm({ ...quickAddForm, direction: 'debit' })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  quickAddForm.direction === 'debit'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Money out
              </button>
              <button
                type="button"
                onClick={() => setQuickAddForm({ ...quickAddForm, direction: 'credit' })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  quickAddForm.direction === 'credit'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Money in
              </button>
            </div>
          </div>
          {quickAddError && <p className="text-[13px] text-rose-500">{quickAddError}</p>}
          <button type="submit" disabled={quickAddSaving} className="btn-primary w-full disabled:opacity-50">
            {quickAddSaving ? 'Saving…' : 'Add transaction'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}

function BarRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'in' | 'out' }) {
  const { format: fmt } = useCurrency()
  const pct = max > 0 ? (value / max) * 100 : 0
  const bar = tone === 'in' ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-slate-300'
  const amount = tone === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`font-semibold tabular-nums ${amount}`}>{fmt(value)}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ActionButton({ href, onClick, label, icon }: { href?: string; onClick?: () => void; label: string; icon: React.ReactNode }) {
  const cls =
    'flex flex-col items-center gap-2 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 press'
  const inner = (
    <>
      <span>{icon}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </>
  )
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function firstName(name: string) {
  return name.split(' ')[0]
}

function cleanLabel(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
