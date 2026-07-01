'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { Liability, DebtPlan } from '@/types'

export default function DebtPage() {
  const { format: fmt } = useCurrency()
  const [liabilities, setLiabilities] = useState<(Liability & { debtPlans?: DebtPlan[] })[]>([])
  const [plans, setPlans] = useState<DebtPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLiability, setSelectedLiability] = useState('')
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche')
  const [extraPayment, setExtraPayment] = useState('')

  const fetchData = useCallback(async () => {
    const [lRes, pRes] = await Promise.all([
      fetch('/api/liabilities').then(r => r.json()),
      fetch('/api/debt-plans').then(r => r.json()),
    ])
    setLiabilities(lRes)
    setPlans(pRes)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLiability) return
    await fetch('/api/debt-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liabilityId: selectedLiability, strategy, extraPayment: extraPayment || '0' }),
    })
    setSelectedLiability('')
    setExtraPayment('')
    fetchData()
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    await fetch(`/api/debt-plans?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  function calculatePayoff(balance: number, rate: number, minPayment: number, extra: number, strategy: string): { months: number; interestPaid: number; totalPaid: number } {
    const monthlyRate = rate / 100 / 12
    const payment = minPayment + extra
    let remaining = balance
    let interestPaid = 0
    let months = 0

    while (remaining > 0 && months < 600) {
      const interest = remaining * monthlyRate
      interestPaid += interest
      const principal = Math.min(payment - interest, remaining)
      remaining -= principal
      months++
    }

    return { months, interestPaid, totalPaid: balance + interestPaid }
  }

  const totalDebt = liabilities.reduce((s, l) => s + l.balance, 0)
  const sortedByBalance = [...liabilities].sort((a, b) => a.balance - b.balance)
  const sortedByRate = [...liabilities].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-600 dark:text-red-400">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Debt Payoff Planner</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              Snowball and avalanche calculators showing payoff dates and interest saved.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Loading your debts…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Syncing liability and plan data.</p>
        </div>
      ) : liabilities.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No debts tracked</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Add liabilities in Net Worth first, then create payoff plans here.
          </p>
          <a href="/dashboard/net-worth" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">Go to Net Worth</a>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total debt</p>
              <p className="text-lg font-semibold stat-number text-red-500">{fmt(totalDebt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium uppercase tracking-wider mb-1">Accounts</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{liabilities.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium uppercase tracking-wider mb-1">Avg interest rate</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {liabilities.filter(l => l.interestRate).length > 0
                  ? (liabilities.filter(l => l.interestRate).reduce((s, l) => s + (l.interestRate || 0), 0) / liabilities.filter(l => l.interestRate).length).toFixed(1) + '%'
                  : 'N/A'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-2xs text-slate-400 font-medium uppercase tracking-wider mb-1">Active plans</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{plans.length}</p>
            </div>
          </div>

          {/* Create plan form */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create payoff plan</h2>
            <form onSubmit={createPlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Liability</label>
                  <select value={selectedLiability} onChange={e => setSelectedLiability(e.target.value)} className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700" required>
                    <option value="">Choose...</option>
                    {liabilities.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({fmt(l.balance)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Strategy</label>
                  <select value={strategy} onChange={e => setStrategy(e.target.value as any)} className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700">
                    <option value="avalanche">Avalanche (highest rate)</option>
                    <option value="snowball">Snowball (smallest balance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 dark:text-slate-400">Extra payment/mo</label>
                  <input type="number" step="0.01" min="0" placeholder="50" className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                    value={extraPayment} onChange={e => setExtraPayment(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm w-full justify-center">Create plan</button>
                </div>
              </div>
            </form>
          </div>

          {/* Active payoff plans */}
          {plans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active payoff plans</h2>
              {plans.map(plan => {
                const liability = liabilities.find(l => l.id === plan.liabilityId)
                if (!liability || !liability.interestRate || !liability.minPayment) return null

                const result = calculatePayoff(liability.balance, liability.interestRate, liability.minPayment, plan.extraPayment, plan.strategy)
                const noExtra = calculatePayoff(liability.balance, liability.interestRate, liability.minPayment, 0, plan.strategy)
                const interestSaved = noExtra.interestPaid - result.interestPaid

                return (
                  <div key={plan.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{liability.name}</h3>
                        <p className="text-xs text-slate-400">{plan.strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} strategy · {fmt(plan.extraPayment)}/mo extra</p>
                      </div>
                      <button onClick={() => deletePlan(plan.id)} className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-2xs text-slate-400 mb-0.5">Payoff time</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.months} mo ({Math.floor(result.months / 12)}y {result.months % 12}m)</p>
                      </div>
                      <div>
                        <p className="text-2xs text-slate-400 mb-0.5">Interest paid</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(Math.round(result.interestPaid))}</p>
                      </div>
                      <div>
                        <p className="text-2xs text-slate-400 mb-0.5">Interest saved</p>
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{fmt(Math.round(interestSaved))}</p>
                      </div>
                      <div>
                        <p className="text-2xs text-slate-400 mb-0.5">Total paid</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(Math.round(result.totalPaid))}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${Math.min(100, (result.months > 0 ? (1 - result.interestPaid / noExtra.interestPaid) * 100 : 0))}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Strategy comparison */}
          {liabilities.filter(l => l.interestRate && l.minPayment).length >= 2 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Strategy comparison</h2>
              <p className="text-xs text-slate-400 mb-4">How snowball vs avalanche compares on your current debts.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left pb-2 font-medium text-slate-400">Debt</th>
                      <th className="text-right pb-2 font-medium text-slate-400">Balance</th>
                      <th className="text-right pb-2 font-medium text-slate-400">Rate</th>
                      <th className="text-right pb-2 font-medium text-slate-400 text-teal-700 dark:text-teal-400">Snowball months</th>
                      <th className="text-right pb-2 font-medium text-slate-400 text-red-600 dark:text-red-400">Avalanche months</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilities.filter(l => l.interestRate && l.minPayment).map(l => {
                      const snowball = calculatePayoff(l.balance, l.interestRate!, l.minPayment!, 0, 'snowball')
                      const avalanche = calculatePayoff(l.balance, l.interestRate!, l.minPayment!, 0, 'avalanche')
                      return (
                        <tr key={l.id} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{l.name}</td>
                          <td className="py-2.5 text-right text-slate-700 dark:text-slate-300">{fmt(l.balance)}</td>
                          <td className="py-2.5 text-right text-slate-500">{l.interestRate}%</td>
                          <td className="py-2.5 text-right font-medium text-teal-700 dark:text-teal-400">{snowball.months}mo</td>
                          <td className="py-2.5 text-right font-medium text-red-600 dark:text-red-400">{avalanche.months}mo</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Snowball</span> pays smallest balances first (psychological wins).
                  <span className="font-semibold ml-2">Avalanche</span> targets highest interest rates first (saves the most money).
                  The best strategy depends on whether you need momentum or math on your side.
                </p>
              </div>
            </div>
          )}

          {/* Strategy order lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Snowball order (by balance)</h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedByBalance.map((l, i) => (
                  <div key={l.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center dark:bg-teal-950 dark:text-teal-300">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.name}</p>
                        <p className="text-2xs text-slate-400">{l.interestRate ? `${l.interestRate}% APR` : 'No rate'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(l.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Avalanche order (by rate)</h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedByRate.map((l, i) => (
                  <div key={l.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center dark:bg-red-950 dark:text-red-300">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.name}</p>
                        <p className="text-2xs text-slate-400">{l.interestRate ? `${l.interestRate}% APR` : 'No rate'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(l.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
