'use client'

import { useState, useEffect, useCallback } from 'react'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { MobileTransactions } from '@/components/transactions/MobileTransactions'
import { SyncButton } from '@/components/ui/SyncButton'
import { useCurrency } from '@/hooks/useCurrency'
import type { Transaction } from '@/types'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'

const PERIODS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'quarter', label: '90 days' },
  { value: 'year', label: '1 year' },
]

const DIRECTIONS = [
  { value: '', label: 'All' },
  { value: 'debit', label: 'Expenses' },
  { value: 'credit', label: 'Income' },
]

export default function TransactionsPage() {
  const [selected, setSelected] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [direction, setDirection] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      period,
      page: String(page),
      limit: '50',
    })
    if (direction) params.set('direction', direction)
    if (search) params.set('search', search)

    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.transactions || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setLoading(false)
  }, [period, page, direction, search])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { format: fmt } = useCurrency()
  const totalDebits = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalCredits = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <>
      {/* Mobile view */}
      <div className="block lg:hidden">
        <MobileTransactions
          initialTransactions={transactions}
          initialTotal={total}
          initialPages={pages}
          period={period}
          direction={direction}
          search={search}
          page={page}
          onPeriodChange={setPeriod}
          onDirectionChange={setDirection}
          onSearchChange={setSearch}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block max-w-4xl mx-auto space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-400">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 16l4-8 4 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Transactions</h1>
              <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">{total.toLocaleString()} transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton />
            <SyncButton />
          </div>
        </div>

        {/* Summary row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1 dark:text-slate-500">Income</p>
              <p className="text-lg font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(totalCredits)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1 dark:text-slate-500">Expenses</p>
              <p className="text-lg font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(totalDebits)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1 dark:text-slate-500">Net</p>
              <p className={`text-lg font-semibold stat-number ${totalCredits - totalDebits >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500 dark:text-red-400'}`}>
                {fmt(totalCredits - totalDebits)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search merchant or description…"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1) }}
              className="input pl-9 text-sm"
            />
          </div>

          {/* Period */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            {DIRECTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { setDirection(d.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  direction === d.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading transactions…</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Fetching your latest transactions.</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8.5 14.5C9.2 16 10.5 17 12 17s2.8-1 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/>
                  <circle cx="14.5" cy="10.5" r="1.2" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No transactions yet</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto dark:text-slate-400">
                Sync your accounts to see your transactions here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {transactions.map(tx => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelected(tx)}
                  aria-label={`Open ${tx.merchantName || tx.description}`}
                  className="w-full px-2 text-left hover:bg-[var(--surface-muted)] transition-colors"
                >
                  <TransactionRow transaction={tx} />
                </button>
              ))}
            </div>
          )}
        </div>

        <TransactionDetail
          transaction={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
          onChanged={fetchTransactions}
        />

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Downloads the transaction history as a spreadsheet.
 *
 * A plain <a download> would be simpler, but the endpoint is authenticated and
 * can fail (rate limit, server error) — fetching lets a failure surface as a
 * message instead of the browser silently saving an error page as a .csv.
 */
function ExportButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/export/transactions')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Export failed.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
        'fintrack-transactions.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Released on the next tick; revoking immediately can cancel the download
      // in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button onClick={download} disabled={busy} className="btn-secondary text-xs py-2 px-3 disabled:opacity-50">
        {busy ? 'Preparing…' : 'Export CSV'}
      </button>
      {error && (
        <p role="alert" className="absolute right-0 top-full mt-1 text-2xs text-[var(--negative)] whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  )
}
