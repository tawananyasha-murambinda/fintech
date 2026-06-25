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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Investments & Crypto</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track stocks, ETFs, crypto, and other investments.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4">
          {showForm ? 'Cancel' : 'Add investment'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createInvestment} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input type="text" required placeholder="Apple Inc." className="input text-sm"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ticker (optional)</label>
              <input type="text" placeholder="AAPL" className="input text-sm"
                value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="label">Shares</label>
              <input type="number" step="any" min="0" placeholder="10" className="input text-sm"
                value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} />
            </div>
            <div>
              <label className="label">Cost basis (avg price)</label>
              <input type="number" step="0.01" min="0" placeholder="150.00" className="input text-sm"
                value={form.costBasis} onChange={e => setForm({ ...form, costBasis: e.target.value })} />
            </div>
            <div>
              <label className="label">Current price</label>
              <input type="number" step="0.01" min="0" placeholder="175.00" className="input text-sm"
                value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm">Add investment</button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : investments.length === 0 ? (
        <div className="card p-16 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-slate-300">
            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 12l3-3 3 3 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">No investments tracked</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
            Add stocks, crypto, ETFs, and other investments to see your complete portfolio.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add investment</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Total value</p>
              <p className="text-lg font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(totalValue)}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Cost basis</p>
              <p className="text-lg font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(totalCostBasis)}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Gain/Loss</p>
              <p className={`text-lg font-semibold stat-number ${totalGain >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500'}`}>
                {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {investments.map(inv => {
              const currentValue = inv.shares && inv.currentPrice ? inv.shares * inv.currentPrice : inv.costBasis || 0
              const gain = currentValue - (inv.costBasis || 0)
              const gainPct = inv.costBasis ? ((gain / inv.costBasis) * 100) : 0

              return (
                <div key={inv.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${inv.type === 'crypto' ? 'bg-amber-500' : inv.type === 'stock' ? 'bg-blue-500' : inv.type === 'etf' ? 'bg-purple-500' : 'bg-slate-500'}`}>
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
                      <button onClick={() => deleteInvestment(inv.id)} className="text-slate-300 hover:text-red-400">
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
