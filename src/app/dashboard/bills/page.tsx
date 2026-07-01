'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

interface Bill {
  id: string
  name: string
  amount: number
  dueDate: number
  frequency: string
  category: string | null
  reminderDays: number
  isActive: boolean
  nextDueDate: string
  daysUntilDue: number
}

const CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Internet', 'Phone', 'Streaming', 'Memberships', 'Other']

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

export default function BillsPage() {
  const { format: fmt } = useCurrency()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', dueDate: '', frequency: 'monthly', category: '', reminderDays: '3' })
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    const res = await fetch('/api/bills')
    const data = await res.json()
    setBills(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBills() }, [fetchBills])

  async function saveBill(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.amount || !form.dueDate) { setError('Fill in all required fields'); return }

    const dueDateNum = parseInt(form.dueDate)
    if (dueDateNum < 1 || dueDateNum > 31) { setError('Due date must be 1-31'); return }

    const url = editingId ? `/api/bills/${editingId}` : '/api/bills'
    const method = editingId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        amount: parseFloat(form.amount),
        dueDate: dueDateNum,
        frequency: form.frequency,
        category: form.category || null,
        reminderDays: parseInt(form.reminderDays),
      }),
    })

    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', amount: '', dueDate: '', frequency: 'monthly', category: '', reminderDays: '3' })
    fetchBills()
  }

  function editBill(bill: Bill) {
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: String(bill.dueDate),
      frequency: bill.frequency,
      category: bill.category || '',
      reminderDays: String(bill.reminderDays),
    })
    setEditingId(bill.id)
    setShowForm(true)
  }

  async function deleteBill(id: string) {
    if (!confirm('Delete this bill?')) return
    await fetch(`/api/bills/${id}`, { method: 'DELETE' })
    fetchBills()
  }

  async function toggleBill(bill: Bill) {
    await fetch(`/api/bills/${bill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !bill.isActive }),
    })
    fetchBills()
  }

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const upcomingBills = bills
    .filter((b) => b.isActive && b.daysUntilDue >= 0 && b.daysUntilDue <= 7)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  const totalMonthly = bills.filter((b) => b.isActive).reduce((s, b) => s + b.amount, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-rose-600 dark:text-rose-400">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="hidden lg:block text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Bills & Calendar</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Track recurring bills and upcoming due dates.</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', amount: '', dueDate: '', frequency: 'monthly', category: '', reminderDays: '3' }) }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
          {showForm ? 'Cancel' : 'Add bill'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveBill} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Name *</label>
              <input type="text" placeholder="Rent" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Amount *</label>
              <input type="number" step="0.01" min="0" placeholder="1500" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Due date (day) *</label>
              <input type="number" min="1" max="31" placeholder="1" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="input text-sm">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input text-sm">
                <option value="">None</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Reminder (days before)</label>
              <input type="number" min="0" max="30" value={form.reminderDays}
                onChange={(e) => setForm({ ...form, reminderDays: e.target.value })}
                className="input text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
            {editingId ? 'Update bill' : 'Add bill'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : bills.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No bills yet</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Add your recurring bills to get due-date reminders and see your total monthly obligations.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Add bill</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Total monthly</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmt(totalMonthly)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Active bills</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {bills.filter((b) => b.isActive).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Due this week</p>
              <p className={`text-lg font-bold ${upcomingBills.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>
                {upcomingBills.length}
              </p>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-2xs text-slate-400 font-medium text-center py-1">{d}</div>
              ))}
              {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
                const day = i + 1
                const dayBills = bills.filter((b) => b.isActive && b.dueDate === day)
                const isToday = day === currentDay
                const isPast = day < currentDay
                return (
                  <div key={day} className={`relative p-1.5 text-center rounded-lg text-xs min-h-[44px] ${isToday ? 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'} ${isPast ? 'opacity-60' : ''}`}>
                    <span className={`text-xs font-medium ${isToday ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {day}
                    </span>
                    {dayBills.slice(0, 2).map((bill) => (
                      <div key={bill.id} className="mt-0.5">
                        <div className="text-2xs leading-tight truncate rounded px-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                          {bill.name}
                        </div>
                      </div>
                    ))}
                    {dayBills.length > 2 && (
                      <div className="text-2xs text-slate-400 mt-0.5">+{dayBills.length - 2}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming reminders */}
          {upcomingBills.length > 0 && (
            <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Due soon</h2>
              </div>
              <div className="space-y-2">
                {upcomingBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
                      <p className="text-2xs text-slate-500">
                        {bill.daysUntilDue === 0 ? 'Due today' : `Due in ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(bill.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill list */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {bills.map((bill) => (
              <div key={bill.id} className={`p-4 ${!bill.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => toggleBill(bill)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${bill.isActive ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {bill.isActive && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 3L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
                      <p className="text-2xs text-slate-400">
                        Due {formatDay(bill.dueDate)} · {FREQUENCY_LABELS[bill.frequency] || bill.frequency}
                        {bill.category && ` · ${bill.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(bill.amount)}</p>
                      {bill.isActive && bill.daysUntilDue <= bill.reminderDays && bill.daysUntilDue >= 0 && (
                        <p className="text-2xs text-amber-600 dark:text-amber-400">
                          {bill.daysUntilDue === 0 ? 'Due today' : `${bill.daysUntilDue}d`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => editBill(bill)}
                        className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M10 1.5l2.5 2.5L4.5 12H2v-2.5L10 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button onClick={() => deleteBill(bill.id)}
                        className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatDay(day: number): string {
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  return `the ${day}${suffix}`
}
