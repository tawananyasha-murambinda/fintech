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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Shared Household</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            Manage shared finances with a partner or family.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm py-2 px-4">
          {showCreate ? 'Cancel' : 'Create household'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createHousehold} className="card p-5 space-y-4">
          <div>
            <label className="label">Household name</label>
            <input type="text" required placeholder="Smith Family" className="input text-sm"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary text-sm">Create</button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : households.length === 0 ? (
        <div className="card p-16 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-slate-300">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">No households yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
            Create a household to share financial overviews with a partner or family members.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create household</button>
        </div>
      ) : (
        <div className="space-y-4">
          {households.map(h => (
            <div key={h.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{h.name}</h2>
                <p className="text-2xs text-slate-400">{h.members.length} member{h.members.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="space-y-2">
                {h.members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold dark:bg-teal-950 dark:text-teal-300">
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
