'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { TaxEntry } from '@/types'

const TAX_TYPES = ['deduction', 'income', 'donation', 'business_expense', 'medical', 'education', 'other']
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export default function TaxPage() {
  const { format: fmt } = useCurrency()
  const [entries, setEntries] = useState<TaxEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ year: String(new Date().getFullYear()), type: 'deduction', description: '', amount: '', category: '', date: '' })

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/tax-entries')
    const data = await res.json()
    setEntries(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) return
    await fetch('/api/tax-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ year: String(new Date().getFullYear()), type: 'deduction', description: '', amount: '', category: '', date: '' })
    fetchEntries()
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/tax-entries?id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const byYear = entries.reduce<Record<number, TaxEntry[]>>((acc, e) => {
    if (!acc[e.year]) acc[e.year] = []
    acc[e.year].push(e)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Tax Organizer</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              Track deductible expenses, charitable donations, and business expenses year-round.
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={showForm ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm'}>
          {showForm ? 'Cancel' : 'Add entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createEntry} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Year</label>
              <select className="input text-sm" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TAX_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" required placeholder="0.00" className="input text-sm"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input type="text" required placeholder="e.g. Home office supplies" className="input text-sm"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Category (optional)</label>
              <input type="text" placeholder="Office expenses" className="input text-sm"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add entry</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">No tax entries yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
            Track tax-deductible expenses, donations, and business costs throughout the year.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add entry</button>
        </div>
      ) : (
        Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearEntries]) => {
          const totals = yearEntries.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + e.amount
            acc.total += e.amount
            return acc
          }, { total: 0 } as Record<string, number>)

          return (
            <div key={year} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{year} entries</h2>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{fmt(totals.total)} total</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(totals).filter(([k]) => k !== 'total').map(([type, total]) => (
                  <div key={type} className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                    <p className="text-2xs text-slate-400">{type.replace(/_/g, ' ')}</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{fmt(total)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {yearEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-100">{entry.description}</p>
                      <p className="text-2xs text-slate-400">
                        {entry.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        {entry.category ? ` · ${entry.category}` : ''}
                        {entry.date ? ` · ${new Date(entry.date).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(entry.amount)}</p>
                      <button onClick={() => deleteEntry(entry.id)} className="text-slate-300 hover:text-red-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {entries.length > 0 && (
        <div className="flex gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 dark:bg-amber-950 dark:border-amber-900/40">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-600 shrink-0 mt-0.5">
            <path d="M8 1.5L2 4v4c0 3.31 2.69 6 6 6s6-2.69 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M7.5 5v3.5M7.5 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-0.5 dark:text-amber-300">Tax reminder</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is a tracking tool only. Consult a tax professional for actual filing. Keep receipts for all deductible expenses.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
