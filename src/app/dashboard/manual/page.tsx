'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { ManualTransaction } from '@/types'

export default function ManualTransactionsPage() {
  const { format: fmt } = useCurrency()
  const [transactions, setTransactions] = useState<ManualTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', direction: 'debit', description: '', merchantName: '', merchantCategory: '' })

  const fetchTransactions = useCallback(async () => {
    const res = await fetch('/api/manual-transactions')
    const data = await res.json()
    setTransactions(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const createTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.description) return
    await fetch('/api/manual-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], amount: '', direction: 'debit', description: '', merchantName: '', merchantCategory: '' })
    fetchTransactions()
  }

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/manual-transactions?id=${id}`, { method: 'DELETE' })
    fetchTransactions()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Manual Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Add cash transactions, receipt captures, or anything not linked to a bank.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4">
          {showForm ? 'Cancel' : 'Add transaction'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTransaction} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" required className="input text-sm" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" required placeholder="0.00" className="input text-sm"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input text-sm" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
                <option value="debit">Expense</option>
                <option value="credit">Income</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input type="text" placeholder="Food & Dining" className="input text-sm"
                value={form.merchantCategory} onChange={e => setForm({ ...form, merchantCategory: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input type="text" required placeholder="e.g. Cash withdrawal" className="input text-sm"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Merchant (optional)</label>
              <input type="text" placeholder="Merchant name" className="input text-sm"
                value={form.merchantName} onChange={e => setForm({ ...form, merchantName: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm">Add transaction</button>
        </form>
      )}

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card p-16 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-slate-300">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">No manual transactions</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
            Add cash purchases, check payments, or any transactions not captured by your linked bank.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Add transaction</button>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${tx.direction === 'credit' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tx.description}</p>
                    <p className="text-2xs text-slate-400">
                      {new Date(tx.date).toLocaleDateString()}
                      {tx.merchantName ? ` · ${tx.merchantName}` : ''}
                      {tx.merchantCategory ? ` · ${tx.merchantCategory}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold stat-number ${tx.direction === 'credit' ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                  </p>
                  <button onClick={() => deleteTransaction(tx.id)} className="text-slate-300 hover:text-red-400">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
