'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { Asset, Liability } from '@/types'

const ASSET_TYPES = ['checking', 'savings', 'investment', 'crypto', 'property', 'vehicle', 'other']
const LIABILITY_TYPES = ['credit_card', 'student_loan', 'mortgage', 'auto_loan', 'personal_loan', 'other']

const TYPE_COLORS: Record<string, string> = {
  checking: 'bg-teal-500',
  savings: 'bg-blue-500',
  investment: 'bg-purple-500',
  crypto: 'bg-amber-500',
  property: 'bg-green-500',
  vehicle: 'bg-pink-500',
  credit_card: 'bg-red-500',
  student_loan: 'bg-indigo-500',
  mortgage: 'bg-orange-500',
  auto_loan: 'bg-cyan-500',
  personal_loan: 'bg-rose-500',
}

export default function NetWorthPage() {
  const { format: fmt } = useCurrency()
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<'asset' | 'liability' | null>(null)
  const [form, setForm] = useState<any>({})
  const [netWorth, setNetWorth] = useState(0)

  const fetchData = useCallback(async () => {
    const [aRes, lRes] = await Promise.all([
      fetch('/api/net-worth').then(r => r.json()),
      fetch('/api/liabilities').then(r => r.json()),
    ])
    setAssets(aRes.assets || [])
    setLiabilities(lRes)
    setNetWorth(aRes.netWorth || 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(null)
    setForm({})
    fetchData()
  }

  const createLiability = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/liabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(null)
    setForm({})
    fetchData()
  }

  const deleteAsset = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    await fetch(`/api/assets?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const deleteLiability = async (id: string) => {
    if (!confirm('Delete this liability?')) return
    await fetch(`/api/liabilities?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Net Worth</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track assets, liabilities, and total net worth over time.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(showForm === 'asset' ? null : 'asset')} className="btn-secondary text-sm py-2 px-3">
            Add asset
          </button>
          <button onClick={() => setShowForm(showForm === 'liability' ? null : 'liability')} className="btn-primary text-sm py-2 px-3">
            Add liability
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={showForm === 'asset' ? createAsset : createLiability} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input type="text" required placeholder={showForm === 'asset' ? 'Home value' : 'Credit card'} className="input text-sm"
                value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{showForm === 'asset' ? 'Type' : 'Type'}</label>
              <select className="input text-sm" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">Select...</option>
                {(showForm === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{showForm === 'asset' ? 'Value' : 'Balance'}</label>
              <input type="number" step="0.01" required placeholder="0.00" className="input text-sm"
                value={form.value || form.balance || ''} onChange={(e) => setForm({ ...form, [showForm === 'asset' ? 'value' : 'balance']: e.target.value })} />
            </div>
            {showForm === 'liability' && (
              <>
                <div>
                  <label className="label">Interest rate %</label>
                  <input type="number" step="0.01" placeholder="5.99" className="input text-sm"
                    value={form.interestRate || ''} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Min payment</label>
                  <input type="number" step="0.01" placeholder="50" className="input text-sm"
                    value={form.minPayment || ''} onChange={(e) => setForm({ ...form, minPayment: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <button type="submit" className="btn-primary text-sm">
            Add {showForm === 'asset' ? 'asset' : 'liability'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Total assets</p>
              <p className="text-2xl font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(totalAssets)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Total liabilities</p>
              <p className="text-2xl font-semibold stat-number text-red-500">{fmt(totalLiabilities)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Net worth</p>
              <p className={`text-2xl font-semibold stat-number ${netWorth >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500'}`}>
                {fmt(netWorth)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Assets</h2>
              {assets.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No assets added yet.</p>
              ) : (
                <div className="space-y-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[asset.type] || 'bg-slate-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{asset.name}</p>
                          <p className="text-2xs text-slate-400">{asset.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(asset.value)}</p>
                        <button onClick={() => deleteAsset(asset.id)} className="text-slate-300 hover:text-red-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Liabilities</h2>
              {liabilities.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No liabilities added yet.</p>
              ) : (
                <div className="space-y-2">
                  {liabilities.map((liability) => (
                    <div key={liability.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[liability.type] || 'bg-slate-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{liability.name}</p>
                          <p className="text-2xs text-slate-400">
                            {liability.type.replace(/_/g, ' ')}
                            {liability.interestRate ? ` · ${liability.interestRate}% APR` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(liability.balance)}</p>
                          {liability.minPayment && <p className="text-2xs text-slate-400">Min: {fmt(liability.minPayment)}</p>}
                        </div>
                        <button onClick={() => deleteLiability(liability.id)} className="text-slate-300 hover:text-red-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
