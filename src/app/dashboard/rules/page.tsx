'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CategorizationRule } from '@/types'

const COMMON_CATEGORIES = ['Food & Dining', 'Groceries', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities', 'Health & Fitness', 'Travel', 'Education', 'Coffee', 'Income', 'Transfer']

export default function RulesPage() {
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ matchType: 'merchant', matchValue: '', category: 'Shopping', priority: '0' })
  const [error, setError] = useState('')

  const fetchRules = useCallback(async () => {
    const res = await fetch('/api/rules')
    const data = await res.json()
    setRules(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.matchValue || !form.category) { setError('Fill in all fields'); return }

    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
    setShowForm(false)
    setForm({ matchType: 'merchant', matchValue: '', category: 'Shopping', priority: '0' })
    fetchRules()
  }

  const deleteRule = async (id: string) => {
    await fetch(`/api/rules?id=${id}`, { method: 'DELETE' })
    fetchRules()
  }

  const toggleRule = async (rule: CategorizationRule) => {
    await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
    })
    fetchRules()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-600 dark:text-orange-400">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Categorization Rules</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              Auto-categorize transactions based on merchant, description, or amount.
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'Add rule'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={createRule} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Match type</label>
              <select className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700" value={form.matchType} onChange={e => setForm({ ...form, matchType: e.target.value })}>
                <option value="merchant">Merchant name</option>
                <option value="description">Description</option>
                <option value="amount_lt">Amount less than</option>
                <option value="amount_gt">Amount greater than</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Match value</label>
              <input type="text" required placeholder="Starbucks" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.matchValue} onChange={e => setForm({ ...form, matchValue: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Category</label>
              <select className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Priority</label>
              <input type="number" min="0" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500" value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add rule</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading rules…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Fetching your categorization rules.</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No rules yet</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Create rules like "Anything from 'Starbucks' → Coffee" or "Amazon under $20 → Shopping".
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add rule</button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {rules.map(rule => (
            <div key={rule.id} className={`px-5 py-4 ${!rule.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => toggleRule(rule)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${rule.isActive ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    {rule.isActive && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 3L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {rule.matchType === 'merchant' ? 'Merchant' : rule.matchType === 'description' ? 'Description' : rule.matchType === 'amount_lt' ? 'Amount <' : 'Amount >'}
                    </span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{rule.matchValue}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-300 shrink-0"><path d="M3 7h8M7 3v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">{rule.category}</span>
                    <span className="text-2xs text-slate-400">Priority: {rule.priority}</span>
                  </div>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
