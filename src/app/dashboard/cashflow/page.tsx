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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Cash Flow Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Projected account balances day-by-day based on known bills and income.</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : !data ? (
        <div className="card p-16 text-center">
          <p className="text-sm text-slate-400">Connect a bank account to see projections.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Monthly income</p>
              <p className="text-lg font-semibold stat-number text-teal-700 dark:text-teal-400">{fmt(data.income)}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Monthly bills</p>
              <p className="text-lg font-semibold stat-number text-red-500">{fmt(data.monthlyBills)}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-2xs text-slate-400 font-medium uppercase mb-1">Projected end balance</p>
              <p className={`text-lg font-semibold stat-number ${data.projectedBalance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-500'}`}>
                {fmt(data.projectedBalance)}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Daily projection</h2>
            <div className="space-y-1">
              {data.dailyProjection.map((day) => (
                <div key={day.day} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${day.events.length > 0 ? 'bg-amber-50 dark:bg-amber-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{day.date}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${day.balance >= 0 ? 'bg-teal-500' : 'bg-red-400'}`}
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
                    <p className={`text-xs font-semibold stat-number ${day.balance >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-red-500'}`}>
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
