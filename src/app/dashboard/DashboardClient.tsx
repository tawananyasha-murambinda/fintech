'use client'

import { useState } from 'react'
import { CashflowRibbon } from '@/components/charts/CashflowRibbon'
import { CategoryChart } from '@/components/charts/CategoryChart'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { StatCard } from '@/components/ui/StatCard'
import { SyncButton } from '@/components/ui/SyncButton'
import { LinkBankButton } from '@/components/bank/LinkBankButton'
import type { CashflowPoint, SpendingCategory } from '@/types'

interface DashboardClientProps {
  data: {
    stats: {
      monthlyIncome: number
      monthlyExpenses: number
      netCashflow: number
      savingsRate: number
      expenseChange: number
      linkedAccounts: number
    }
    cashflow: CashflowPoint[]
    categories: { category: string; total: number; percentage: number }[]
    recentTransactions: any[]
    hasData: boolean
  }
  userName: string
}

export function DashboardClient({ data, userName }: DashboardClientProps) {
  const { stats, cashflow, categories, recentTransactions, hasData } = data
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Good {getGreeting()}, {firstName(userName)}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {hasData ? "Here's your financial picture this month." : 'Connect a bank account to get started.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <LinkBankButton />
        </div>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Monthly income"
              value={fmt(stats.monthlyIncome)}
              accent="teal"
            />
            <StatCard
              label="Monthly expenses"
              value={fmt(stats.monthlyExpenses)}
              change={stats.expenseChange}
              changeLabel="vs last month"
            />
            <StatCard
              label="Net cashflow"
              value={fmt(stats.netCashflow)}
              accent={stats.netCashflow >= 0 ? 'teal' : 'red'}
            />
            <StatCard
              label="Savings rate"
              value={`${Math.max(0, stats.savingsRate).toFixed(1)}%`}
              accent={stats.savingsRate >= 20 ? 'teal' : stats.savingsRate >= 10 ? 'amber' : 'red'}
            />
          </div>

          {/* Cashflow ribbon */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Cashflow</h2>
                <p className="text-xs text-slate-400 mt-0.5">Income and expenses over time</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                  Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />
                  Expenses
                </span>
              </div>
            </div>
            <CashflowRibbon data={cashflow} />
          </div>

          {/* Categories + Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Spending by category</h2>
              <CategoryChart data={categories} />
            </div>

            <div className="card p-5 lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Recent transactions</h2>
                <a href="/dashboard/transactions" className="text-xs text-teal-700 hover:underline">
                  View all
                </a>
              </div>
              <div className="space-y-1">
                {recentTransactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-slate-900 mb-2">No accounts linked</h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
        Connect your bank account to start tracking your spending and get AI-powered insights.
      </p>
      <LinkBankButton />
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function firstName(name: string) {
  return name.split(' ')[0]
}
