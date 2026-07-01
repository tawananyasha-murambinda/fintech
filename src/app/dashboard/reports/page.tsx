'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

export default function ReportsPage() {
  const { format: fmt } = useCurrency()
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ period, year, month })
    const res = await fetch(`/api/reports?${params}`)
    const data = await res.json()
    setReport(data)
    setLoading(false)
  }, [period, year, month])

  useEffect(() => { fetchReport() }, [fetchReport])

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-600 dark:text-indigo-400">
              <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 16l4-8 4 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Monthly & Yearly Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Income, expenses, top categories, and savings rate.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <select value={year} onChange={e => setYear(e.target.value)} className="input text-sm w-24">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {period !== 'year' && (
            <select value={month} onChange={e => setMonth(e.target.value)} className="input text-sm w-32">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          )}
          <button onClick={fetchReport} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
            {loading ? 'Loading...' : 'Generate report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Income</p>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{fmt(report.income)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Expenses</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{fmt(report.expenses)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Net cashflow</p>
              <p className={`text-xl font-bold ${report.netCashflow >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500'}`}>{fmt(report.netCashflow)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Savings rate</p>
              <p className={`text-xl font-bold ${report.savingsRate >= 20 ? 'text-teal-600' : report.savingsRate >= 10 ? 'text-amber-600' : 'text-rose-500'}`}>
                {report.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Top categories</h2>
              <div className="space-y-3">
                {report.topCategories.map((cat: any) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{cat.category}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {fmt(cat.total)} ({cat.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.min(100, cat.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-sm">
                <span className="text-slate-500">{report.txCount} transactions</span>
                <span className="text-slate-500">Avg: {fmt(report.avgTransaction)}/tx</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Daily activity</h2>
              <div className="h-48">
                <div className="flex items-end gap-0.5 h-40 mb-2">
                  {report.dailyTotals.slice(0, 60).map((day: any) => {
                    const allNets = report.dailyTotals.map((d: any) => Math.abs(d.net))
                    const max = Math.max(...allNets, 1)
                    const h = Math.max(2, (Math.abs(day.net) / max) * 100)
                    return (
                      <div key={day.date} className="flex-1 flex items-end justify-center group relative">
                        <div className={`w-full rounded-t transition-all ${day.net >= 0 ? 'bg-teal-500' : 'bg-red-400'}`}
                          style={{ height: `${h}%` }} />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-2xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap dark:bg-slate-700">
                          {fmt(Math.abs(day.net))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500">
                  <span>{report.dailyTotals[0]?.date ? new Date(report.dailyTotals[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-500 inline-block" /> Income</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block" /> Expenses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {report.income > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Report summary</h2>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5">
                <p className="text-sm text-slate-700 leading-relaxed dark:text-slate-300">
                  For {report.period}, your total income was <strong className="text-slate-900 dark:text-slate-100">{fmt(report.income)}</strong> and total expenses were <strong className="text-slate-900 dark:text-slate-100">{fmt(report.expenses)}</strong>.
                  Your savings rate was <strong className={report.savingsRate >= 20 ? 'text-teal-700' : report.savingsRate >= 10 ? 'text-amber-600' : 'text-red-500'}>{report.savingsRate.toFixed(1)}%</strong>.
                  {report.topCategories.length > 0 && (
                    <> Top spending category was <strong className="text-slate-900 dark:text-slate-100">{report.topCategories[0].category}</strong> at <strong className="text-slate-900 dark:text-slate-100">{fmt(report.topCategories[0].total)}</strong>.</>
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
