'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

export default function CashflowPage() {
  const { format: fmt } = useCurrency()
  const [data, setData] = useState<{
    bills: any[]
    income: number
    monthlyBills: number
    projectedBalance: number
    dailyProjection: { day: number; date: string; balance: number; events: string[] }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [txRes, billRes] = await Promise.all([
        fetch('/api/transactions?period=month&page=1&limit=200').then(r => r.json()),
        fetch('/api/bills').then(r => r.json()),
      ])

      const now = new Date()
      const currentDay = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      const income = txRes.transactions?.filter((t: any) => t.direction === 'credit').reduce((s: number, t: any) => s + Math.abs(t.amount), 0) || 0
      const expenses = txRes.transactions?.filter((t: any) => t.direction === 'debit').reduce((s: number, t: any) => s + Math.abs(t.amount), 0) || 0
      const avgDailyExpense = currentDay > 0 ? expenses / currentDay : 0

      const monthlyBills = (billRes || []).filter((b: any) => b.isActive).reduce((s: number, b: any) => s + b.amount, 0)

      let runningBalance = income - expenses
      const dailyProjection = []

      for (let d = currentDay; d <= daysInMonth; d++) {
        const events: string[] = []
        const dayBills = (billRes || []).filter((b: any) => b.isActive && b.dueDate === d)
        for (const bill of dayBills) {
          runningBalance -= bill.amount
          events.push(`Bill: ${bill.name} (${fmt(bill.amount)})`)
        }
        const expectedDaily = avgDailyExpense * 0.8
        runningBalance -= expectedDaily
        if (d % 7 === 0) { runningBalance += income * 0.25; events.push('Expected income') }
        dailyProjection.push({
          day: d,
          date: new Date(now.getFullYear(), now.getMonth(), d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          balance: runningBalance,
          events,
        })
      }

      setData({ bills: billRes || [], income, monthlyBills, projectedBalance: runningBalance, dailyProjection })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-600 dark:text-cyan-400">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="hidden lg:block text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Cash Flow Calendar</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Projected account balances day-by-day based on known bills and income.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No projection data</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto dark:text-slate-400">Connect a bank account to see projections.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Monthly income</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{fmt(data.income)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Monthly bills</p>
              <p className="text-lg font-bold text-rose-500">{fmt(data.monthlyBills)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Projected end balance</p>
              <p className={`text-lg font-bold ${data.projectedBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500'}`}>
                {fmt(data.projectedBalance)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Daily projection</h2>
            <div className="space-y-1">
              {data.dailyProjection.map((day) => (
                <div key={day.day} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${day.events.length > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{day.date}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${day.balance >= 0 ? 'bg-teal-500' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(100, ((day.balance + Math.abs(data.projectedBalance)) / (Math.abs(data.income) + Math.abs(data.monthlyBills) + 1)) * 100)}%` }} />
                    </div>
                    {day.events.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {day.events.map((e, i) => (
                          <span key={i} className="text-2xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded dark:bg-amber-900 dark:text-amber-300">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <p className={`text-xs font-bold ${day.balance >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'}`}>
                      {fmt(day.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
