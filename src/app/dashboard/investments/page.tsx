'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { Investment } from '@/types'

const INVESTMENT_TYPES = ['stock', 'etf', 'mutual_fund', 'crypto', 'bond', 'real_estate', 'other']

export default function InvestmentsPage() {
  const { format: fmt } = useCurrency()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'stock', shares: '', costBasis: '', currentPrice: '', ticker: '', notes: '' })

  const fetchInvestments = useCallback(async () => {
    const res = await fetch('/api/investments')
    const data = await res.json()
    setInvestments(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvestments() }, [fetchInvestments])

  const createInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.type) return
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ name: '', type: 'stock', shares: '', costBasis: '', currentPrice: '', ticker: '', notes: '' })
    fetchInvestments()
  }

  const deleteInvestment = async (id: string) => {
    if (!confirm('Delete this investment?')) return
    await fetch(`/api/investments?id=${id}`, { method: 'DELETE' })
    fetchInvestments()
  }

  const totalValue = investments.reduce((s, i) => {
    if (i.shares && i.currentPrice) return s + i.shares * i.currentPrice
    return s + (i.costBasis || 0)
  }, 0)

  const totalCostBasis = investments.reduce((s, i) => s + (i.costBasis || 0), 0)
  const totalGain = totalValue - totalCostBasis

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-600 dark:text-blue-400">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 12l3-3 3 3 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="hidden lg:block text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Investments & Crypto</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track stocks, ETFs, crypto, and other investments.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'Add investment'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={createInvestment} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Name</label>
              <input type="text" required placeholder="Apple Inc." className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Type</label>
              <select className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Ticker (optional)</label>
              <input type="text" placeholder="AAPL" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Shares</label>
              <input type="number" step="any" min="0" placeholder="10" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Cost basis (avg price)</label>
              <input type="number" step="0.01" min="0" placeholder="150.00" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.costBasis} onChange={e => setForm({ ...form, costBasis: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Current price</label>
              <input type="number" step="0.01" min="0" placeholder="175.00" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add investment</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading investments…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Fetching your portfolio data.</p>
        </div>
      ) : investments.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 12l3-3 3 3 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No investments tracked</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Add stocks, crypto, ETFs, and other investments to see your complete portfolio.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add investment</button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Total value</p>
              <p className="text-lg font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(totalValue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Cost basis</p>
              <p className="text-lg font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(totalCostBasis)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Gain/Loss</p>
              <p className={`text-lg font-semibold stat-number ${totalGain >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500'}`}>
                {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
              </p>
            </div>
          </div>

          {/* Investment list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {investments.map(inv => {
              const currentValue = inv.shares && inv.currentPrice ? inv.shares * inv.currentPrice : inv.costBasis || 0
              const gain = currentValue - (inv.costBasis || 0)
              const gainPct = inv.costBasis ? ((gain / inv.costBasis) * 100) : 0

              return (
                <div key={inv.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${inv.type === 'crypto' ? 'bg-slate-900 dark:bg-slate-100' : inv.type === 'stock' ? 'bg-slate-900 dark:bg-slate-100' : inv.type === 'etf' ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-900 dark:bg-slate-100'}`}>
                        {inv.ticker || inv.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{inv.name}</p>
                        <p className="text-2xs text-slate-400">
                          {inv.type.replace(/_/g, ' ')}
                          {inv.ticker ? ` · ${inv.ticker}` : ''}
                          {inv.shares ? ` · ${inv.shares} shares` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(currentValue)}</p>
                        <p className={`text-2xs font-medium ${gain >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                        </p>
                      </div>
                      <button onClick={() => deleteInvestment(inv.id)} className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
