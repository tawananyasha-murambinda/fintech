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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Credit Score</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track your credit score over time.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4">
          {showForm ? 'Cancel' : 'Add score'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addScore} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Credit score</label>
              <input type="number" min="300" max="850" required placeholder="750" className="input text-sm"
                value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            </div>
            <div>
              <label className="label">Provider</label>
              <select className="input text-sm" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                <option value="">Select...</option>
                <option value="credit_karma">Credit Karma</option>
                <option value="equifax">Equifax</option>
                <option value="experian">Experian</option>
                <option value="transunion">TransUnion</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm">Save</button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : scores.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-sm text-slate-500">No credit scores tracked yet.</p>
        </div>
      ) : (
        <>
          <div className="card p-6 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase mb-1">Current score</p>
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

          <div className="card p-5">
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
