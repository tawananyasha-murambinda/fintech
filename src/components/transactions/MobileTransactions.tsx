'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useHaptics } from '@/hooks/useHaptics'
import { GradientHeader } from '@/components/layout/GradientHeader'
import type { Transaction } from '@/types'

const PERIODS = [
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
  { value: 'quarter', label: '90d' },
  { value: 'year', label: '1y' },
]

const DIRECTIONS = [
  { value: '', label: 'All' },
  { value: 'debit', label: 'Expense' },
  { value: 'credit', label: 'Income' },
]

function groupByDate(txs: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  for (const tx of txs) {
    const key = tx.date.split('T')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return groups
}

function formatDateHeader(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null
  const cleaned = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className="text-2xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
      {cleaned}
    </span>
  )
}

interface MobileTransactionsProps {
  initialTransactions: Transaction[]
  initialTotal: number
  initialPages: number
  period: string
  direction: string
  search: string
  page: number
  onPeriodChange: (v: string) => void
  onDirectionChange: (v: string) => void
  onSearchChange: (v: string) => void
  onPageChange: (v: number) => void
  loading: boolean
}

export function MobileTransactions({
  initialTransactions,
  initialTotal,
  initialPages,
  period,
  direction,
  search,
  page,
  onPeriodChange,
  onDirectionChange,
  onSearchChange,
  onPageChange,
  loading,
}: MobileTransactionsProps) {
  const { format: fmt } = useCurrency()
  const [searchInput, setSearchInput] = useState(search)
  const [showFilters, setShowFilters] = useState(false)

  const { containerRef, pullDistance, refreshing, pullIndicator } = usePullToRefresh({
    onRefresh: useCallback(async () => {
      // Parent will re-fetch via period change trigger
      await new Promise(r => setTimeout(r, 500))
    }, []),
    threshold: 70,
  })

  const debouncedSearch = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current)
    debouncedSearch.current = setTimeout(() => {
      onSearchChange(searchInput)
    }, 400)
    return () => { if (debouncedSearch.current) clearTimeout(debouncedSearch.current) }
  }, [searchInput])

  const grouped = groupByDate(initialTransactions)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const totalDebits = initialTransactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalCredits = initialTransactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div ref={containerRef} className="flex flex-col min-h-full pb-2">
      {/* Pull-to-refresh indicator */}
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

      {/* Header */}
      <GradientHeader
        title="Activity"
        subtitle={`${initialTotal} transactions`}
        action={
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filters"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white press"
            style={{ background: 'rgba(255,255,255,0.16)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
          <p className="text-2xs text-slate-400 font-medium mb-0.5">Income</p>
          <p className="text-base font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(totalCredits)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
          <p className="text-2xs text-slate-400 font-medium mb-0.5">Expenses</p>
          <p className="text-base font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(totalDebits)}</p>
        </div>
      </div>

      {/* Filter bar - collapsible */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 mb-3 space-y-3 animate-fade-up">
          <div className="relative">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search…"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); onPageChange(1) }}
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => { onPeriodChange(p.value); onPageChange(1) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 ${
                  period === p.value
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {DIRECTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { onDirectionChange(d.value); onPageChange(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 ${
                  direction === d.value
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction list - grouped by date */}
      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-3 w-20" />
                {[1, 2].map(j => (
                  <div key={j} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="skeleton h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <div className="skeleton h-3 w-24" />
                      <div className="skeleton h-2 w-16" />
                    </div>
                    <div className="skeleton h-3 w-14" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : initialTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 text-slate-300">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-slate-400">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing your filters</p>
          </div>
        ) : (
          sortedDates.map(dateStr => (
            <div key={dateStr}>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 px-1">
                {formatDateHeader(dateStr)}
                <span className="ml-1.5 text-slate-300 dark:text-slate-600">· {grouped[dateStr].length}</span>
              </p>
              <div className="space-y-1">
                {grouped[dateStr].map(tx => (
                  <MobileTransactionItem key={tx.id} tx={tx} fmt={fmt} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {initialPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400">Page {page} of {initialPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-400"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(Math.min(initialPages, page + 1))}
              disabled={page === initialPages}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-400"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Coffee', 'Shopping', 'Transportation',
  'Entertainment', 'Bills & Utilities', 'Health & Fitness', 'Travel',
  'Education', 'Income', 'Transfer', 'Rent', 'Insurance', 'Personal Care',
  'Home Improvement', 'Gifts & Donations', 'Subscriptions', 'Uncategorized',
]

function MobileTransactionItem({ tx, fmt }: { tx: Transaction; fmt: (n: number) => string }) {
  const haptics = useHaptics()
  const name = tx.merchantName || tx.description
  const isCredit = tx.direction === 'credit'
  const [showSheet, setShowSheet] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(tx.merchantCategory || '')
  const [saveAsRule, setSaveAsRule] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [catMessage, setCatMessage] = useState('')

  async function handleAiCategorize() {
    setCategorizing(true)
    setCatMessage('')
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: tx.merchantName || '',
          description: tx.description || '',
          transactionId: tx.id,
        }),
      })
      const data = await res.json()
      if (data.category) {
        setSelectedCategory(data.category)
        setCatMessage(`AI suggests: ${data.category}`)
      } else {
        setCatMessage('AI could not determine a category')
      }
    } catch {
      setCatMessage('Failed to categorize')
    }
    setCategorizing(false)
  }

  async function handleSaveCategory() {
    if (!selectedCategory || selectedCategory === tx.merchantCategory) {
      setShowSheet(false)
      return
    }
    setSaving(true)
    try {
      await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: tx.merchantName || '',
          description: tx.description || '',
          transactionId: tx.id,
          category: selectedCategory,
        }),
      })
      if (saveAsRule && tx.merchantName) {
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchType: 'merchant',
            matchValue: tx.merchantName,
            category: selectedCategory,
          }),
        })
      }
      setShowSheet(false)
    } catch {}
    setSaving(false)
  }

  return (
    <>
      <div
        onClick={() => { haptics.light(); setShowSheet(true) }}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{name}</p>
            {tx.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-400">
              {format(parseISO(tx.date), 'MMM d')}
            </span>
            {tx.merchantCategory && <CategoryBadge category={tx.merchantCategory} />}
          </div>
        </div>
        <p className={`text-sm font-semibold tabular-nums shrink-0 ${
          isCredit ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-slate-100'
        }`}>
          {isCredit ? '+' : '-'}{fmt(tx.amount)}
        </p>
      </div>

      {/* Bottom sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white dark:bg-slate-900 w-full rounded-t-2xl p-5 animate-slide-up max-h-[75vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base font-bold text-slate-600 dark:text-slate-300">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                <p className="text-xs text-slate-400">
                  {format(parseISO(tx.date), 'MMMM d, yyyy')}
                  {tx.status === 'pending' && <span className="ml-1 text-amber-500">· Pending</span>}
                </p>
              </div>
              <p className={`text-lg font-bold tabular-nums ${
                isCredit ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-slate-100'
              }`}>
                {isCredit ? '+' : '-'}{fmt(tx.amount)}
              </p>
            </div>

            <div className="space-y-4">
              {tx.description && tx.description !== name && (
                <div>
                  <p className="text-2xs text-slate-400 font-medium mb-0.5">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{tx.description}</p>
                </div>
              )}

              {/* Recategorization */}
              <div>
                <p className="text-2xs text-slate-400 font-medium mb-1.5">Category</p>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Uncategorized</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAiCategorize}
                    disabled={categorizing}
                    className="px-3 py-2 text-xs font-medium bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900"
                  >
                    {categorizing ? '…' : 'AI'}
                  </button>
                </div>
                {catMessage && (
                  <p className="text-2xs text-slate-400 mt-1">{catMessage}</p>
                )}
              </div>

              {/* Save as rule toggle */}
              {tx.merchantName && selectedCategory && selectedCategory !== tx.merchantCategory && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsRule}
                    onChange={e => setSaveAsRule(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Auto-apply for all <span className="font-medium text-slate-700 dark:text-slate-300">{tx.merchantName}</span> transactions
                  </span>
                </label>
              )}

              <div>
                <p className="text-2xs text-slate-400 font-medium mb-0.5">Status</p>
                <span className={`badge ${tx.status === 'posted' ? 'badge-credit' : 'badge-pending'}`}>
                  {tx.status}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveCategory}
              disabled={saving}
              className="w-full mt-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving…' : selectedCategory !== tx.merchantCategory ? 'Save category' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
