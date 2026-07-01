'use client'

import { useState, useEffect } from 'react'

interface Household {
  id: string
  name: string
  members: { id: string; role: string; user: { id: string; name: string | null; email: string | null; image: string | null } }[]
  createdAt: string
}

export default function HouseholdPage() {
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/households').then(r => r.json()).then(d => {
      setHouseholds(d)
      setLoading(false)
    })
  }, [])

  const createHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    const res = await fetch('/api/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const h = await res.json()
      setHouseholds(prev => [...prev, h])
      setShowCreate(false)
      setName('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Shared Household</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              Manage shared finances with a partner or family.
            </p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showCreate ? 'Cancel' : 'Create household'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createHousehold} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Household name</label>
            <input type="text" required placeholder="Smith Family" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Create</button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading households…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Fetching your shared households.</p>
        </div>
      ) : households.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No households yet</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Create a household to share financial overviews with a partner or family members.
          </p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Create household</button>
        </div>
      ) : (
        <div className="space-y-4">
          {households.map(h => (
            <div key={h.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{h.name}</h2>
                <p className="text-2xs text-slate-400">{h.members.length} member{h.members.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {h.members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold dark:bg-amber-950 dark:text-amber-300">
                      {(m.user.name || m.user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.user.name || 'Unnamed'}</p>
                      <p className="text-2xs text-slate-400">{m.user.email} · {m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
