'use client'

import { useState, useEffect } from 'react'
import type { CreditScore } from '@/types'

export default function CreditScorePage() {
  const [scores, setScores] = useState<CreditScore[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ score: '', provider: '' })

  useEffect(() => {
    fetch('/api/credit-score').then(r => r.json()).then(d => {
      setScores(d)
      setLoading(false)
    })
  }, [])

  const addScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.score) return
    await fetch('/api/credit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ score: '', provider: '' })
    const res = await fetch('/api/credit-score')
    setScores(await res.json())
  }

  const latest = scores[0]
  const previous = scores[1]

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-400">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Credit Score</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track your credit score over time.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'Add score'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addScore} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Credit score</label>
              <input type="number" min="300" max="850" required placeholder="750" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Provider</label>
              <select className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                <option value="">Select...</option>
                <option value="credit_karma">Credit Karma</option>
                <option value="equifax">Equifax</option>
                <option value="experian">Experian</option>
                <option value="transunion">TransUnion</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Save</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading scores…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Fetching your credit history.</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No credit scores tracked</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Start tracking your credit score from providers like Equifax, Experian, and TransUnion.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add your first score</button>
        </div>
      ) : (
        <>
          {/* Current score */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
            <p className="text-2xs text-slate-400 font-medium uppercase tracking-wider mb-2">Current score</p>
            <p className={`text-5xl font-bold stat-number ${
              latest.score >= 740 ? 'text-teal-700 dark:text-teal-400' : latest.score >= 670 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
            }`}>
              {latest.score}
            </p>
            <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
              {latest.score >= 800 ? 'Exceptional' : latest.score >= 740 ? 'Very Good' : latest.score >= 670 ? 'Good' : latest.score >= 580 ? 'Fair' : 'Poor'}
              {previous && ` · ${latest.score - previous.score >= 0 ? '+' : ''}${latest.score - previous.score} from last`}
              {latest.provider ? ` · via ${latest.provider.replace(/_/g, ' ')}` : ''}
            </p>
          </div>

          {/* History chart */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">History</h2>
            <div className="h-48 flex items-end gap-2">
              {scores.slice().reverse().map((s, i, arr) => {
                const h = ((s.score - 300) / 550) * 100
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className={`w-full rounded-t transition-all ${s.score >= 740 ? 'bg-teal-500' : s.score >= 670 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ height: `${h}%` }} />
                    <div className="absolute -top-8 bg-slate-900 text-white text-2xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap dark:bg-slate-700">
                      {s.score} ({new Date(s.createdAt).toLocaleDateString()})
                    </div>
                    <p className="text-2xs text-slate-400 mt-1">{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short' })}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
