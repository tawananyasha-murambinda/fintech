'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  color: string
}

const GOAL_COLORS: Record<string, string> = {
  teal: 'from-teal-400 to-teal-600',
  blue: 'from-blue-400 to-blue-600',
  purple: 'from-purple-400 to-purple-600',
  pink: 'from-pink-400 to-pink-600',
  amber: 'from-amber-400 to-amber-600',
  green: 'from-green-400 to-green-600',
  red: 'from-red-400 to-red-600',
  indigo: 'from-indigo-400 to-indigo-600',
}

const BG_COLORS: Record<string, string> = {
  teal: 'bg-teal-50 dark:bg-teal-950',
  blue: 'bg-blue-50 dark:bg-blue-950',
  purple: 'bg-purple-50 dark:bg-purple-950',
  pink: 'bg-pink-50 dark:bg-pink-950',
  amber: 'bg-amber-50 dark:bg-amber-950',
  green: 'bg-green-50 dark:bg-green-950',
  red: 'bg-red-50 dark:bg-red-950',
  indigo: 'bg-indigo-50 dark:bg-indigo-950',
}

export default function GoalsPage() {
  const { format: fmt } = useCurrency()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '', color: 'teal' })
  const [error, setError] = useState('')

  const fetchGoals = useCallback(async () => {
    const res = await fetch('/api/goals')
    const data = await res.json()
    setGoals(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.targetAmount) { setError('Name and target are required'); return }

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        deadline: form.deadline || null,
        color: form.color,
      }),
    })

    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
    setShowForm(false)
    setForm({ name: '', targetAmount: '', deadline: '', color: 'teal' })
    fetchGoals()
  }

  async function contribute(id: string, currentAmount: number, targetAmount: number) {
    const amount = prompt('Amount to add?', '50')
    if (!amount) return
    const newAmount = Math.min(currentAmount + parseFloat(amount), targetAmount)
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentAmount: newAmount }),
    })
    fetchGoals()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    fetchGoals()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Savings Goals</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track your savings targets and progress.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'New goal'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createGoal} className="rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Goal name</label>
              <input type="text" placeholder="e.g. Emergency fund" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="label">Target amount</label>
              <input type="number" step="0.01" min="0" placeholder="10000" value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="label">Target date (optional)</label>
              <input type="date" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="label">Color</label>
              <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="input text-sm">
                {Object.keys(GOAL_COLORS).map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Create goal</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-8 h-8 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No savings goals yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 dark:text-slate-400">
            Create your first goal — whether it's a vacation, emergency fund, or a big purchase.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Create goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            const grad = GOAL_COLORS[goal.color] || GOAL_COLORS.teal
            const bg = BG_COLORS[goal.color] || BG_COLORS.teal
            const remaining = goal.targetAmount - goal.currentAmount
            const isComplete = goal.currentAmount >= goal.targetAmount

            const daysUntilDeadline = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null

            const neededPerMonth = daysUntilDeadline && daysUntilDeadline > 0 && remaining > 0
              ? remaining / (daysUntilDeadline / 30)
              : null

            return (
              <div key={goal.id} className={`rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 ${isComplete ? 'ring-2 ring-teal-400' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
                      className={`text-${goal.color === 'teal' ? 'teal' : goal.color}-600 dark:text-${goal.color === 'teal' ? 'teal' : goal.color}-400`}>
                      <path d="M11 2l9 5v8l-9 5-9-5V7l9-5z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M11 12l-3-2M11 12l3-2M11 12v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">{goal.name}</h3>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400">
                    {fmt(goal.currentAmount)} of {fmt(goal.targetAmount)}
                  </p>
                  <p className="text-xs font-semibold stat-number text-slate-700 dark:text-slate-300">
                    {pct.toFixed(0)}%
                  </p>
                </div>

                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3 dark:bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  {isComplete ? (
                    <span className="text-teal-700 font-medium dark:text-teal-400">Completed!</span>
                  ) : (
                    <span className="text-slate-500">{fmt(remaining)} to go</span>
                  )}
                  <div className="flex gap-2">
                    {!isComplete && (
                      <button onClick={() => contribute(goal.id, goal.currentAmount, goal.targetAmount)}
                        className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400">
                        Add funds
                      </button>
                    )}
                  </div>
                </div>

                {daysUntilDeadline && daysUntilDeadline > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-2xs text-slate-400">
                      {daysUntilDeadline <= 0
                        ? 'Past deadline'
                        : `${daysUntilDeadline} days remaining`
                      }
                      {neededPerMonth && neededPerMonth > 0
                        ? ` · ${fmt(Math.round(neededPerMonth))}/mo needed`
                        : ''}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
