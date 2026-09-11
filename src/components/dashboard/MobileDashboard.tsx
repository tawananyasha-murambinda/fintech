'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import { useCurrency } from '@/hooks/useCurrency'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MerchantMark } from '@/components/ui/MerchantMark'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useHaptics } from '@/hooks/useHaptics'
import type { CashflowPoint } from '@/types'

// Mobile home.
//
// The previous version was a gradient hero with glow orbs, a centred balance
// and a row of circular actions — which is Revolut's home screen, closely. This
// takes the opposite approach and borrows from the ledger-style apps instead
// (Copilot, Mercury, Lunch Money): left-aligned editorial type, hairline rules
// rather than a stack of floating cards, colour reserved for meaning, and one
// genuinely informative graphic instead of decoration.

interface Account {
  id: string
  institutionName: string
  accountType: string
  accountName: string
  currency: string
  lastSynced: string | null
  balance: number | null
  netFlow: number
  hasRealBalance: boolean
}

interface MobileDashboardProps {
  stats: {
    monthlyIncome: number
    monthlyExpenses: number
    netCashflow: number
    savingsRate: number
    linkedAccounts: number
    expenseChange?: number
  }
  categories: { category: string; total: number; percentage: number }[]
  recentTransactions: any[]
  cashflow?: CashflowPoint[]
  hasData: boolean
  userName: string
}

function DashboardSkeleton() {
  return (
    <div className="px-5 pt-6 space-y-6">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-12 w-52 rounded" />
      <div className="skeleton h-20 w-full rounded-xl" />
      <div className="skeleton h-48 w-full rounded-xl" />
    </div>
  )
}

/**
 * Daily spending across the month.
 *
 * Replaces the two income/expense progress bars, which compared this month
 * only against itself. The rhythm of when money leaves is the thing you can
 * actually recognise about your own habits — the big Saturday, the quiet week.
 */
function SpendRhythm({ points, accent }: { points: CashflowPoint[]; accent: string }) {
  const { format: fmt } = useCurrency()
  const [selected, setSelected] = useState<number | null>(null)

  const days = points.slice(-31)
  const max = Math.max(...days.map((d) => d.expenses), 1)
  const active = selected !== null ? days[selected] : null

  if (days.length < 3) return null

  return (
    <section className="px-5 py-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Daily spend</h2>
        <p className="text-xs text-[var(--ink-faint)] tabular-nums">
          {active
            ? `${new Date(active.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${fmt(active.expenses)}`
            : `${days.length} days`}
        </p>
      </div>

      <div className="flex items-end gap-[3px] h-16" role="img" aria-label="Daily spending for the last month">
        {days.map((d, i) => {
          const height = Math.max(2, (d.expenses / max) * 100)
          const isActive = selected === i
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelected(isActive ? null : i)}
              aria-label={`${new Date(d.date).toLocaleDateString()}: ${fmt(d.expenses)}`}
              className="flex-1 rounded-[2px] transition-opacity"
              style={{
                height: `${height}%`,
                background: isActive ? accent : 'var(--line-strong)',
                opacity: selected === null || isActive ? 1 : 0.4,
                minWidth: 3,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

/** Money in and out, as two figures rather than two competing bars. */
function FlowRow({
  income,
  expenses,
  change,
}: {
  income: number
  expenses: number
  change?: number
}) {
  const { format: fmt } = useCurrency()

  return (
    <section className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--line)' }}>
      <div className="px-5 py-4">
        <p className="text-xs text-[var(--ink-faint)] mb-1">In</p>
        <p className="stat-number text-lg text-[var(--positive)]">{fmt(income)}</p>
      </div>
      <div className="px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <p className="text-xs text-[var(--ink-faint)] mb-1">Out</p>
        <p className="stat-number text-lg text-[var(--ink)]">{fmt(expenses)}</p>
        {typeof change === 'number' && Math.abs(change) >= 1 && (
          <p
            className="text-xs mt-0.5"
            style={{ color: change > 0 ? 'var(--negative)' : 'var(--positive)' }}
          >
            {change > 0 ? '↑' : '↓'} {Math.abs(Math.round(change))}% on last month
          </p>
        )}
      </div>
    </section>
  )
}

export function MobileDashboard({
  stats,
  categories,
  recentTransactions,
  cashflow = [],
  hasData,
  userName,
}: MobileDashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const { format: fmt, toDisplay } = useCurrency()
  const router = useRouter()
  const searchParams = useSearchParams()
  const haptics = useHaptics()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({ description: '', amount: '', direction: 'debit' })
  const [quickAddError, setQuickAddError] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const accent = 'var(--accent)'

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/accounts')
      const data = await res.json()
      setAccounts(data.banks || [])
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleRefresh = useCallback(async () => {
    await fetchAccounts()
    router.refresh()
  }, [fetchAccounts, router])

  const { containerRef, pullDistance, refreshing, pullIndicator } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 70,
  })

  const selectedAccountId = searchParams.get('account')
  const activeAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null

  // Only accounts with a balance Plaid actually reported are summed. Mixing in
  // the ones without would produce a total that silently understates.
  const priced = (activeAccount ? [activeAccount] : accounts).filter((a) => a.hasRealBalance)
  const balance = priced.reduce((s, a) => s + toDisplay(a.balance ?? 0, a.currency), 0)
  const missingBalances = (activeAccount ? [activeAccount] : accounts).length - priced.length

  const accountLabel = activeAccount
    ? activeAccount.accountName || activeAccount.institutionName
    : accounts.length === 1
      ? accounts[0].accountName || accounts[0].institutionName
      : `${accounts.length} accounts`

  const today = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  )

  function selectAccount(accountId: string | null) {
    haptics.light()
    const params = new URLSearchParams(searchParams.toString())
    if (accountId) params.set('account', accountId)
    else params.delete('account')
    router.push(`/dashboard${params.toString() ? '?' + params.toString() : ''}`)
    setShowAccounts(false)
  }

  if (loading) return <DashboardSkeleton />

  const empty = accounts.length === 0 && !hasData

  return (
    <div ref={containerRef} className="flex flex-col min-h-full -mx-4 -mt-4 pb-24">
      {pullIndicator && (
        <div className="flex items-center justify-center h-10">
          {refreshing ? (
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <div
              className="w-4 h-4 text-[var(--ink-faint)]"
              style={{ transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Header. Left-aligned and typographic — the balance is a statement,
          not a banner, and there is no gradient to compete with it. */}
      <header className="px-5 pt-4 pb-6">
        <div className="flex items-start justify-between gap-3 mb-7">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">{firstName(userName)}</p>
            <p className="text-xs text-[var(--ink-faint)] mt-0.5">{today}</p>
          </div>
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 press"
            style={{ background: 'var(--surface-sunken)', color: 'var(--ink-soft)' }}
          >
            {firstName(userName).charAt(0).toUpperCase()}
          </Link>
        </div>

        {!empty && (
          <>
            <button
              onClick={() => {
                haptics.light()
                setShowAccounts(true)
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-muted)] mb-2 press"
            >
              {accountLabel}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m3 5 3 3 3-3" />
              </svg>
            </button>

            {priced.length > 0 ? (
              <p className="display-number text-[2.75rem] text-[var(--ink)]">{fmt(balance)}</p>
            ) : (
              <>
                <p className="display-number text-[2rem] text-[var(--ink-faint)]">Not available</p>
                <p className="text-xs text-[var(--ink-faint)] mt-1.5 max-w-[16rem] leading-relaxed">
                  Your bank has not reported a balance yet. Pull down to refresh, or open an
                  account for its recent activity.
                </p>
              </>
            )}

            {missingBalances > 0 && priced.length > 0 && (
              <p className="text-xs text-[var(--ink-faint)] mt-1.5">
                Excludes {missingBalances} account{missingBalances > 1 ? 's' : ''} with no reported balance
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  haptics.medium()
                  setShowQuickAdd(true)
                }}
                className="btn-primary text-sm py-2 px-4"
              >
                Add transaction
              </button>
              <Link href="/dashboard/transactions" className="btn-secondary text-sm py-2 px-4">
                All activity
              </Link>
            </div>
          </>
        )}
      </header>

      {empty && (
        <div className="px-5">
          <div className="card p-6 text-center">
            <p className="text-base font-semibold mb-1.5 text-[var(--ink)]">Add your first account</p>
            <p className="text-sm text-[var(--ink-muted)] mb-6">
              Connect a bank to see balances and spending in one place.
            </p>
            <LinkBankButton />
          </div>
        </div>
      )}

      {!empty && (
        <>
          <div className="divider" />
          <FlowRow
            income={stats.monthlyIncome}
            expenses={stats.monthlyExpenses}
            change={stats.expenseChange}
          />

          {cashflow.length >= 3 && (
            <>
              <div className="divider" />
              <SpendRhythm points={cashflow} accent={accent} />
            </>
          )}

          {categories.length > 0 && (
            <>
              <div className="divider" />
              <section className="px-5 py-5">
                <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Where it went</h2>
                <div className="space-y-3.5">
                  {categories.slice(0, 5).map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: accent, opacity: 1 - i * 0.15 }}
                      />
                      <span className="text-sm text-[var(--ink-soft)] flex-1 min-w-0 truncate">
                        {cleanLabel(cat.category)}
                      </span>
                      <span className="text-xs text-[var(--ink-faint)] tabular-nums w-10 text-right">
                        {Math.round(cat.percentage)}%
                      </span>
                      <span className="stat-number text-sm text-[var(--ink)] w-20 text-right">
                        {fmt(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {recentTransactions.length > 0 && (
            <>
              <div className="divider" />
              <section className="py-5">
                <div className="flex items-baseline justify-between px-5 mb-1">
                  <h2 className="text-sm font-semibold text-[var(--ink)]">Recent</h2>
                  <Link href="/dashboard/transactions" className="text-xs text-[var(--accent)] font-medium">
                    See all
                  </Link>
                </div>
                <LedgerList transactions={recentTransactions.slice(0, 8)} />
              </section>
            </>
          )}
        </>
      )}

      <BottomSheet open={showAccounts} onClose={() => setShowAccounts(false)} title="Accounts">
        <div className="space-y-1">
          <AccountItem
            active={!selectedAccountId}
            name="All accounts"
            sub={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
            amount={priced.length > 0 ? fmt(balance) : '—'}
            onClick={() => selectAccount(null)}
          />
          {accounts.map((a) => (
            <AccountItem
              key={a.id}
              active={selectedAccountId === a.id}
              name={a.accountName || a.institutionName}
              sub={`${a.accountType} · ${a.currency}`}
              amount={a.hasRealBalance ? fmt(toDisplay(a.balance ?? 0, a.currency)) : '—'}
              onClick={() => selectAccount(a.id)}
            />
          ))}
        </div>
      </BottomSheet>

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
                  date: new Date().toISOString(),
                }),
              })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Could not save that.')
              }
              haptics.success()
              setShowQuickAdd(false)
              setQuickAddForm({ description: '', amount: '', direction: 'debit' })
              router.refresh()
            } catch (err) {
              haptics.error()
              setQuickAddError(err instanceof Error ? err.message : 'Could not save that.')
            } finally {
              setQuickAddSaving(false)
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            {(['debit', 'credit'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setQuickAddForm((f) => ({ ...f, direction: dir }))}
                className="py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  borderColor: quickAddForm.direction === dir ? 'var(--accent)' : 'var(--line)',
                  background: quickAddForm.direction === dir ? 'var(--accent-wash)' : 'transparent',
                  color: quickAddForm.direction === dir ? 'var(--accent-ink)' : 'var(--ink-muted)',
                }}
              >
                {dir === 'debit' ? 'Money out' : 'Money in'}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="text"
            value={quickAddForm.description}
            onChange={(e) => setQuickAddForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What was it?"
            className="input"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={quickAddForm.amount}
            onChange={(e) => setQuickAddForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            className="input stat-number text-lg"
          />
          {quickAddError && (
            <p role="alert" className="text-xs text-[var(--negative)]">
              {quickAddError}
            </p>
          )}
          <button type="submit" disabled={quickAddSaving} className="btn-primary w-full disabled:opacity-50">
            {quickAddSaving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}

/**
 * Transactions grouped under the day they happened, with the date as a quiet
 * rail down the left. A flat list of rows loses the sense of "that was all one
 * Saturday", which is how people actually remember spending.
 */
function LedgerList({ transactions }: { transactions: any[] }) {
  const { format: fmt } = useCurrency()

  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const t of transactions) {
      const key = new Date(t.date).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return [...map.entries()]
  }, [transactions])

  return (
    <div>
      {groups.map(([day, items]) => (
        <div key={day}>
          <p className="px-5 pt-4 pb-1.5 text-2xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
            {relativeDay(day)}
          </p>
          {items.map((t) => {
            const isCredit = t.direction === 'credit'
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                <MerchantMark name={t.merchantName || t.description} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--ink)] truncate">
                    {t.merchantName || t.description}
                  </p>
                  {t.merchantCategory && (
                    <p className="text-xs text-[var(--ink-faint)] truncate">
                      {cleanLabel(t.merchantCategory)}
                    </p>
                  )}
                </div>
                <span
                  className="stat-number text-sm shrink-0"
                  style={{ color: isCredit ? 'var(--positive)' : 'var(--ink)' }}
                >
                  {isCredit ? '+' : '−'}
                  {fmt(Math.abs(t.amount))}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function AccountItem({
  active,
  name,
  sub,
  amount,
  onClick,
}: {
  active: boolean
  name: string
  sub: string
  amount: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left press"
      style={{ background: active ? 'var(--surface-sunken)' : 'transparent' }}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
        style={{ background: 'var(--surface-sunken)', color: 'var(--ink-soft)' }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-[var(--ink)] truncate">{name}</span>
        <span className="block text-xs text-[var(--ink-faint)]">{sub}</span>
      </span>
      <span className="stat-number text-sm text-[var(--ink)]">{amount}</span>
    </button>
  )
}

function firstName(name: string) {
  return name?.split(' ')[0] || 'there'
}

function cleanLabel(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeDay(day: string): string {
  const date = new Date(day)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
