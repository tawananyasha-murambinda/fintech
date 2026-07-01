'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Vault {
  id: string
  name: string
  targetAmount: number | null
  currentAmount: number
  color: string
}

interface RoundUpRule {
  id: string
  vaultId: string | null
  vault: Vault | null
}

const COLORS = ['teal', 'purple', 'pink', 'amber', 'blue', 'green', 'red', 'indigo']
const COLOR_MAP: Record<string, string> = {
  teal: 'from-teal-500 to-teal-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  amber: 'from-amber-500 to-amber-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  indigo: 'from-indigo-500 to-indigo-600',
}

export default function VaultPage() {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [rule, setRule] = useState<RoundUpRule | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', targetAmount: '', color: 'teal' })
  const [adding, setAdding] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function loadVaults() {
    const res = await fetch('/api/vault')
    const data = await res.json()
    setVaults(data.vaults || [])
    setRule(data.roundUpRule || null)
    setLoading(false)
  }

  useEffect(() => { loadVaults() }, [])

  async function createVault(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
        color: form.color,
      }),
    })
    setForm({ name: '', targetAmount: '', color: 'teal' })
    setShowCreate(false)
    loadVaults()
  }

  async function addFunds(vaultId: string) {
    const amount = parseFloat(adding[vaultId] || '0')
    if (!amount || amount <= 0) return
    await fetch(`/api/vault/${vaultId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    setAdding(prev => ({ ...prev, [vaultId]: '' }))
    loadVaults()
  }

  async function deleteVault(vaultId: string) {
    await fetch(`/api/vault/${vaultId}`, { method: 'DELETE' })
    loadVaults()
  }

  async function toggleRoundUp(enabled: boolean) {
    await fetch('/api/vault/round-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId: vaults[0]?.id || null, enabled }),
    })
    loadVaults()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Savings Vault</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set money aside and save automatically</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          {showCreate ? 'Cancel' : 'New Vault'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createVault} className="card p-4 space-y-3">
          <input type="text" placeholder="Vault name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input text-sm w-full" required />
          <input type="number" step="0.01" placeholder="Target amount (optional)" value={form.targetAmount}
            onChange={e => setForm({ ...form, targetAmount: e.target.value })}
            className="input text-sm w-full" />
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${COLOR_MAP[c]} ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`} />
            ))}
          </div>
          <button type="submit" className="btn-primary text-sm">Create Vault</button>
        </form>
      )}

      {/* Round-up toggle */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Auto Round-Ups</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Round up transactions and save the spare change</p>
        </div>
        <button onClick={() => toggleRoundUp(!rule)}
          className={`w-12 h-6 rounded-full transition-colors ${rule ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'} relative`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${rule ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {vaults.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4 dark:bg-teal-950">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-teal-600 dark:text-teal-400">
              <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">No vaults yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create a vault to start saving toward your goals</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {vaults.map(vault => {
            const pct = vault.targetAmount ? Math.min(100, (vault.currentAmount / vault.targetAmount) * 100) : 0
            return (
              <div key={vault.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${COLOR_MAP[vault.color]}`} />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{vault.name}</h3>
                    </div>
                    {vault.targetAmount && (
                      <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
                        {pct.toFixed(0)}% of ${vault.targetAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      ${vault.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <button onClick={() => deleteVault(vault.id)} className="text-2xs text-red-400 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                </div>

                {vault.targetAmount && (
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800 mb-4">
                    <div className={`h-full rounded-full bg-gradient-to-r ${COLOR_MAP[vault.color]} transition-all duration-500`}
                      style={{ width: `${pct}%` }} />
                  </div>
                )}

                <div className="flex gap-2">
                  <input type="number" step="0.01" placeholder="Add funds…" value={adding[vault.id] || ''}
                    onChange={e => setAdding(prev => ({ ...prev, [vault.id]: e.target.value }))}
                    className="input text-sm flex-1" />
                  <button onClick={() => addFunds(vault.id)}
                    disabled={!adding[vault.id] || parseFloat(adding[vault.id] || '0') <= 0}
                    className="btn-primary text-sm disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
