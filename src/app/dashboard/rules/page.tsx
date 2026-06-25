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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Categorization Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            Auto-categorize transactions based on merchant, description, or amount.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4">
          {showForm ? 'Cancel' : 'Add rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createRule} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Match type</label>
              <select className="input text-sm" value={form.matchType} onChange={e => setForm({ ...form, matchType: e.target.value })}>
                <option value="merchant">Merchant name</option>
                <option value="description">Description</option>
                <option value="amount_lt">Amount less than</option>
                <option value="amount_gt">Amount greater than</option>
              </select>
            </div>
            <div>
              <label className="label">Match value</label>
              <input type="text" required placeholder="Starbucks" className="input text-sm"
                value={form.matchValue} onChange={e => setForm({ ...form, matchValue: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <input type="number" min="0" className="input text-sm" value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="btn-primary text-sm">Add rule</button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : rules.length === 0 ? (
        <div className="card p-16 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-slate-300">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">No rules yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
            Create rules like "Anything from 'Starbucks' → Coffee" or "Amazon under $20 → Shopping".
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add rule</button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={`card p-4 ${!rule.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => toggleRule(rule)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${rule.isActive ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    {rule.isActive && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 3L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-2xs">
                      {rule.matchType === 'merchant' ? 'Merchant' : rule.matchType === 'description' ? 'Description' : rule.matchType === 'amount_lt' ? 'Amount <' : 'Amount >'}
                    </span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{rule.matchValue}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-300"><path d="M3 7h8M7 3v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-2xs">{rule.category}</span>
                    <span className="text-2xs text-slate-400">Priority: {rule.priority}</span>
                  </div>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-slate-300 hover:text-red-400">
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
