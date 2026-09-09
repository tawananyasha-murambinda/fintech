'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import Link from 'next/link'

interface Budget {
  id: string
  category: string
  amount: number
  spent: number
  remaining: number
  period: string
  /** Fraction of the budget spent (can exceed 1). */
  used: number
  /** Fraction of the period elapsed. */
  elapsed: number
  window: { start: string; end: string; label: string }
  isOver: boolean
  isOnPace: boolean
  safeDailySpend: number
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-500',
  'Shopping': 'bg-blue-500',
  'Transportation': 'bg-purple-500',
  'Entertainment': 'bg-pink-500',
  'Bills & Utilities': 'bg-red-500',
  'Health & Fitness': 'bg-green-500',
  'Travel': 'bg-amber-500',
  'Education': 'bg-indigo-500',
  'Groceries': 'bg-lime-500',
  'Coffee': 'bg-yellow-600',
}

// Fallback only. The live list comes from the API so the options always match
// the categories transactions are actually normalised into.
const FALLBACK_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transportation',
  'Entertainment', 'Bills & Utilities', 'Health & Fitness',
  'Travel', 'Education', 'Coffee',
]

export default function BudgetsPage() {
  const { format: fmt } = useCurrency()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: '', amount: '', period: 'monthly' })
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)

  const fetchBudgets = useCallback(async () => {
    const res = await fetch('/api/budgets')
    const data = await res.json()
    setBudgets(Array.isArray(data.budgets) ? data.budgets : [])
    if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  async function createBudget(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.category || !form.amount) { setError('Fill in all fields'); return }

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: form.category, amount: parseFloat(form.amount), period: form.period }),
    })

    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
    setShowForm(false)
    setForm({ category: '', amount: '', period: 'monthly' })
    fetchBudgets()
  }

  async function deleteBudget(id: string) {
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' })
    fetchBudgets()
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-400">
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="hidden lg:block text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Budgets</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Set spending limits per category and track progress.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'Add budget'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createBudget} className="rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input text-sm"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c} value={c.replace(/\s/g, '_').toUpperCase()}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Monthly limit</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="label">Period</label>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="input text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Save budget</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-8 h-8 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No budgets set</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 dark:text-slate-400">
            Create your first budget to start tracking spending limits.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Create budget</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Budgeted</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{fmt(totalBudgeted)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Spent</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{fmt(totalSpent)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium mb-1">Remaining</p>
              <p className={`text-lg font-semibold ${totalBudgeted - totalSpent >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500'}`}>
                {fmt(totalBudgeted - totalSpent)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {budgets.map((budget) => {
              const pct = budget.used * 100
              const colorClass = CATEGORY_COLORS[budget.category] || 'bg-teal-500'
              const isOver = budget.isOver
              const isWarning = !isOver && pct > 80

              return (
                <div key={budget.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{budget.category}</p>
                        <p className="text-2xs text-slate-400">{budget.period} · {budget.window.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Spent</p>
                        <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(budget.spent)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Budget</p>
                        <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(budget.amount)}</p>
                      </div>
                      <button onClick={() => deleteBudget(budget.id)} className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-teal-600'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium ${isOver ? 'text-red-500' : isWarning ? 'text-amber-600' : 'text-teal-700 dark:text-teal-400'}`}>
                      {pct.toFixed(0)}% used
                    </span>
                    <span className="text-xs text-slate-400">
                      {budget.remaining >= 0
                        ? `${fmt(budget.remaining)} remaining`
                        : `${fmt(Math.abs(budget.remaining))} over budget`
                      }
                    </span>
                  </div>

                  {/* Pace projection, measured against this budget's own period */}
                  <BudgetPace budget={budget} fmt={fmt} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function BudgetPace({ budget, fmt }: { budget: Budget; fmt: (n: number) => string }) {
  // Progress comes from the server, which knows whether this budget runs over
  // a week, a month or a quarter. This used to assume a calendar month for
  // every budget, so a weekly budget always looked wildly overspent.
  const { used, elapsed, amount, isOver, safeDailySpend, window } = budget

  if (amount === 0 || elapsed <= 0) return null

  const projectedTotal = used / Math.max(elapsed, 0.01) * amount
  const willExceed = projectedTotal > amount
  const remainingLabel =
    window.label === 'this week' ? 'week' : window.label === 'this month' ? 'month' : 'quarter'

  return (
    <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-2xs ${
            isOver
              ? 'text-red-500'
              : willExceed
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-teal-600 dark:text-teal-400'
          }`}
        >
          {isOver
            ? `Over by ${fmt(Math.abs(budget.remaining))}`
            : willExceed
              ? `On pace to exceed by ${fmt(Math.round(projectedTotal - amount))}`
              : `${fmt(safeDailySpend)}/day keeps you on track`}
        </span>
        <span className="text-2xs text-slate-400 shrink-0">
          {elapsed < 1 ? `${(elapsed * 100).toFixed(0)}% of ${remainingLabel} passed` : `End of ${remainingLabel}`}
        </span>
      </div>
      {willExceed && !isOver && (
        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${Math.min(100, (projectedTotal / amount) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
