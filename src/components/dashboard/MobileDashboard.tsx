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

// ─── Number counter hook ────────────────────────────────────────
function useAnimatedNumber(target: number, active: boolean) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>()

  useEffect(() => {
    if (!active) { setDisplay(target); return }
    const start = performance.now()
    const from = 0
    const duration = 600

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, active])

  return display
}

// ─── Skeleton ──────────────────────────────────────────────────────
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <SkeletonBlock className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <SkeletonBlock className="h-44 w-[280px] shrink-0 rounded-2xl" />
        <SkeletonBlock className="h-44 w-[280px] shrink-0 rounded-2xl" />
        <SkeletonBlock className="h-44 w-[280px] shrink-0 rounded-2xl" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <SkeletonBlock key={i} className="h-16 rounded-xl" />)}
      </div>
      <SkeletonBlock className="h-28 rounded-2xl" />
      <SkeletonBlock className="h-48 rounded-2xl" />
    </div>
  )
}

// ─── Balance display with tick animation ─────────────────────────
function AnimatedBalance({ value, format, active }: { value: number; format: (n: number) => string; active: boolean }) {
  const animated = useAnimatedNumber(value, active)
  const formatted = format(animated)
  return <span className="tabular-nums tracking-tight">{formatted}</span>
}

// ─── Main component ──────────────────────────────────────────────
export function MobileDashboard({ stats, categories, recentTransactions, hasData, userName }: MobileDashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { format: fmt } = useCurrency()
  const router = useRouter()
  const searchParams = useSearchParams()
  const carouselRef = useRef<HTMLDivElement>(null)
  const haptics = useHaptics()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({ description: '', amount: '', direction: 'debit' })
  const [quickAddError, setQuickAddError] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  // Trigger entrance animations after mount
  useEffect(() => { setMounted(true) }, [])

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/plaid/accounts')
    const data = await res.json()
    setAccounts(data.banks || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const handleRefresh = useCallback(async () => {
    await fetchAccounts()
    await new Promise(r => setTimeout(r, 300))
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

  const activeAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null
  const balance = activeAccount ? activeAccount.balance : accounts.reduce((s, a) => s + a.balance, 0)

  if (loading) return <DashboardSkeleton />

  return (
    <div ref={containerRef} className={`flex flex-col min-h-full pb-2 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* ── Pull-to-refresh indicator ──────────────────────── */}
      {pullIndicator && (
        <div className="flex items-center justify-center py-3 -mt-1">
          {refreshing ? (
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div
              className="w-6 h-6 text-teal-600 transition-transform duration-200"
              style={{ transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── Minimal header ─────────────────────────────────── */}
      <div className={`flex items-center justify-between mb-3 ${mounted ? 'animate-slide-down' : ''}`}>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">Welcome back</p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{firstName(userName)}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center press-spring hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-500 dark:text-slate-400">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </Link>
      </div>

      {/* ── No accounts — link CTA ─────────────────────────── */}
      {!loading && accounts.length === 0 && !hasData && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900 p-7 text-center animate-bounce-in shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-600/20">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-white">
              <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M4 10h20" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Link your first account</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Connect your bank to track spending, set budgets, and get AI-powered insights in real time
          </p>
          <LinkBankButton />
        </div>
      )}

      {/* ── Account cards carousel — Revolut-style ─────────── */}
      {accounts.length > 0 && (
        <>
          <div className={`-mx-4 mb-1 ${mounted ? 'animate-fade-in' : ''}`} style={{ animationDelay: '50ms' }}>
            <div
              ref={carouselRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 gap-3 pb-3 snap-scroll"
            >
              {/* All Accounts card */}
              <button
                onClick={() => selectAccount(null)}
                className={`snap-start shrink-0 w-[280px] rounded-2xl p-5 border-2 text-left transition-all duration-300 card-lift ${
                  !selectedAccountId
                    ? 'border-teal-600 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 text-white card-stack-active'
                    : 'border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-700/50 card-stack'
                } ${mounted ? 'animate-card-enter' : ''}`}
                style={{ animationDelay: '80ms' }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-colors ${
                    !selectedAccountId ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 dark:from-teal-950 dark:to-teal-900 dark:text-teal-300'
                  }`}>
                    A
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${!selectedAccountId ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      All Accounts
                    </p>
                    <p className={`text-2xs ${!selectedAccountId ? 'text-teal-200/70' : 'text-slate-400 dark:text-slate-500'}`}>
                      {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                    </p>
                  </div>
                </div>
                <p className={`text-[26px] font-bold tracking-tight ${!selectedAccountId ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                  <AnimatedBalance value={balance} format={fmt} active={!selectedAccountId} />
                </p>
                <p className={`text-2xs mt-1.5 ${!selectedAccountId ? 'text-teal-200/60' : 'text-slate-400 dark:text-slate-500'}`}>
                  Total balance
                </p>
              </button>

              {/* Account cards */}
              {accounts.map((acct, i) => {
                const active = selectedAccountId === acct.id
                return (
                  <button
                    key={acct.id}
                    onClick={() => selectAccount(acct.id)}
                    className={`snap-start shrink-0 w-[280px] rounded-2xl p-5 border-2 text-left transition-all duration-300 card-lift ${
                      active
                        ? 'border-teal-600 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 text-white card-stack-active'
                        : 'border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-700/50 card-stack'
                    } ${mounted ? 'animate-card-enter' : ''}`}
                    style={{ animationDelay: `${120 + i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-colors ${
                        active ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 dark:from-teal-950 dark:to-teal-900 dark:text-teal-300'
                      }`}>
                        {acct.institutionName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                          {acct.accountName || acct.institutionName}
                        </p>
                        <p className={`text-2xs ${active ? 'text-teal-200/70' : 'text-slate-400 dark:text-slate-500'}`}>
                          {acct.accountType} &middot; {acct.currency}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[26px] font-bold tracking-tight ${active ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      <AnimatedBalance value={acct.balance} format={fmt} active={active} />
                    </p>
                    <p className={`text-2xs mt-1.5 ${active ? 'text-teal-200/60' : 'text-slate-400 dark:text-slate-500'}`}>
                      {acct.lastSynced ? `Updated ${timeAgo(acct.lastSynced)}` : 'Not synced'}
                    </p>
                  </button>
                )
              })}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-1.5 mt-0.5">
              {[
                { id: null, active: !selectedAccountId },
                ...accounts.map(a => ({ id: a.id, active: selectedAccountId === a.id }))
              ].map((dot, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    dot.active ? 'w-6 bg-teal-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Quick actions — Revolut-style row ───────────── */}
          <div className={`grid grid-cols-4 gap-2 mb-4 ${mounted ? 'animate-fade-up' : ''}`} style={{ animationDelay: '200ms' }}>
            <ActionButton href="/dashboard/chat" label="Ask AI" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M19 13a2 2 0 01-2 2H6l-4 4V5a2 2 0 012-2h13a2 2 0 012 2v8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            } />
            <ActionButton href="/dashboard/transactions" label="History" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h12M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            } />
            <ActionButton href="/dashboard/budgets" label="Budgets" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 9h8M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            } />
            <ActionButton href="/dashboard/goals" label="Goals" icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="2.5" fill="currentColor"/></svg>
            } />
          </div>

          {/* ── Monthly summary with animated bars ──────────── */}
          <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 mb-4 transition-all duration-500 ${
            mounted ? 'animate-scale-in' : ''
          }`} style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">This month</p>
              <p className={`text-xs font-semibold tabular-nums ${
                stats.netCashflow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500'
              }`}>
                {stats.netCashflow >= 0 ? '+' : ''}{fmt(stats.netCashflow)}
              </p>
            </div>
            <div className="space-y-3">
              <BarRow label="Income" value={stats.monthlyIncome} max={Math.max(stats.monthlyIncome, stats.monthlyExpenses)} color="emerald" />
              <BarRow label="Expenses" value={stats.monthlyExpenses} max={Math.max(stats.monthlyIncome, stats.monthlyExpenses)} color="slate" />
            </div>
          </div>

          {/* ── Recent transactions ─────────────────────────── */}
          {recentTransactions.length > 0 && (
            <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-500 ${
              mounted ? 'animate-scale-in' : ''
            }`} style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-1">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent activity</p>
                <Link href="/dashboard/transactions" className="text-xs text-teal-700 dark:text-teal-400 font-medium press-spring">
                  See all
                </Link>
              </div>
              <div className="px-2 pb-1">
                {recentTransactions.slice(0, 5).map((tx, i) => (
                  <div key={tx.id} className={mounted ? 'animate-stagger-fade' : ''} style={{ animationDelay: `${350 + i * 50}ms` }}>
                    <TransactionRow transaction={tx} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Category chips ──────────────────────────────── */}
          {categories.length > 0 && (
            <div className={`mt-4 ${mounted ? 'animate-fade-up' : ''}`} style={{ animationDelay: '450ms' }}>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                Spending breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 5).map((cat, i) => (
                  <div
                    key={cat.category}
                    className={`px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition-all duration-300 hover:bg-slate-200 dark:hover:bg-slate-700 press-spring ${
                      mounted ? 'animate-scale-in' : ''
                    }`}
                    style={{ animationDelay: `${500 + i * 60}ms` }}
                  >
                    {cat.category}
                    <span className="ml-1.5 text-slate-400 dark:text-slate-500 tabular-nums">{cat.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Quick-add FAB ───────────────────────────────────── */}
      <button
        onClick={() => { haptics.medium(); setShowQuickAdd(true) }}
        className="fixed bottom-20 right-4 w-12 h-12 bg-teal-700 text-white rounded-full shadow-lg shadow-teal-700/30 flex items-center justify-center press-spring z-40"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 5v12M5 11h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── Quick-add bottom sheet ──────────────────────────── */}
      <BottomSheet open={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Add Transaction">
          <form onSubmit={async (e) => {
          e.preventDefault()
          setQuickAddError('')
          if (!quickAddForm.description || !quickAddForm.amount) {
            haptics.error()
            setQuickAddError('Description and amount are required')
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
            setQuickAddError('Failed to save transaction')
          }
          setQuickAddSaving(false)
        }} className="space-y-4">
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              placeholder="e.g. Coffee shop"
              value={quickAddForm.description}
              onChange={e => setQuickAddForm({ ...quickAddForm, description: e.target.value })}
              className="input text-sm"
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
              onChange={e => setQuickAddForm({ ...quickAddForm, amount: e.target.value })}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickAddForm({ ...quickAddForm, direction: 'debit' })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  quickAddForm.direction === 'debit'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setQuickAddForm({ ...quickAddForm, direction: 'credit' })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  quickAddForm.direction === 'credit'
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Income
              </button>
            </div>
          </div>
          {quickAddError && <p className="text-xs text-red-500">{quickAddError}</p>}
          <button
            type="submit"
            disabled={quickAddSaving}
            className="w-full py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg disabled:opacity-50"
          >
            {quickAddSaving ? 'Saving…' : 'Add transaction'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}

// ─── Animated progress bar row ─────────────────────────────────
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: 'emerald' | 'slate' }) {
  const [animate, setAnimate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { format: fmt } = useCurrency()
  const pct = max > 0 ? (value / max) * 100 : 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimate(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const barColor = color === 'emerald'
    ? 'bg-emerald-500 dark:bg-emerald-500'
    : 'bg-slate-400 dark:bg-slate-500'

  return (
    <div ref={ref}>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`font-semibold tabular-nums ${color === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
          {fmt(value)}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{
            width: animate ? `${pct}%` : '0%',
            transitionDelay: color === 'emerald' ? '100ms' : '200ms',
          }}
        />
      </div>
    </div>
  )
}

// ─── Action button with press spring ───────────────────────────
function ActionButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-150 press-spring"
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="text-2xs font-medium">{label}</span>
    </Link>
  )
}

// ─── Helpers ───────────────────────────────────────────────────
function firstName(name: string) {
  return name.split(' ')[0]
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
