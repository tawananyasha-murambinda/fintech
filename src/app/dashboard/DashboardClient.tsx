"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CashflowRibbon } from "@/components/charts/CashflowRibbon";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { StatCard } from "@/components/ui/StatCard";
import { SyncButton } from "@/components/ui/SyncButton";
import { LinkBankButton } from "@/components/bank/LinkBankButton";
import { AccountSwitcher } from "@/components/dashboard/AccountSwitcher";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useCurrency } from "@/hooks/useCurrency";
import type { CashflowPoint, SpendingCategory } from "@/types";

interface DashboardClientProps {
  data: {
    stats: {
      monthlyIncome: number;
      monthlyExpenses: number;
      netCashflow: number;
      savingsRate: number;
      expenseChange: number;
      linkedAccounts: number;
    };
    cashflow: CashflowPoint[];
    categories: { category: string; total: number; percentage: number }[];
    recentTransactions: any[];
    hasData: boolean;
  };
  userName: string;
  userId: string;
  selectedAccountId: string | null;
}

export function DashboardClient({
  data,
  userName,
  userId,
  selectedAccountId,
}: DashboardClientProps) {
  const { stats, cashflow, categories, recentTransactions, hasData } = data;
  const hasAccounts = stats.linkedAccounts > 0;
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const { format: fmt } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAccountChange = useCallback(
    (accountId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (accountId) {
        params.set("account", accountId);
      } else {
        params.delete("account");
      }
      router.push(
        `/dashboard${params.toString() ? "?" + params.toString() : ""}`
      );
    },
    [router, searchParams]
  );

  return (
    <>
      {/* Mobile view */}
      <div className="block lg:hidden">
        <MobileDashboard
          stats={stats}
          categories={categories}
          recentTransactions={recentTransactions}
          hasData={hasData}
          userName={userName}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block max-w-7xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">
              Good {getGreeting()}, {firstName(userName)}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              {hasData
                ? "Here's your financial picture this month."
                : "Connect a bank account to get started."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton />
            <LinkBankButton />
          </div>
        </div>

        {/* Alert banner */}
        <AlertBanner />

        {/* Natural language transaction search */}
        <TransactionSearch />

        {/* Quick Actions */}
        <div className="flex gap-3">
          <QuickAction
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            label="Add Expense"
            onClick={() => (document.getElementById('quick-add-trigger') as HTMLButtonElement)?.click()}
          />
          <QuickAction
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/></svg>}
            label="Sync Accounts"
            onClick={() => (document.querySelector('[data-sync-btn]') as HTMLButtonElement)?.click()}
          />
          <QuickAction
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 9h8M5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            label="Budgets"
            href="/dashboard/budgets"
          />
          <QuickAction
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 11C7 12 7.8 12.5 9 12.5s2-.5 2.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/></svg>}
            label="Ask AI"
            onClick={() => (document.querySelector('[data-chat-btn]') as HTMLButtonElement)?.click()}
          />
          <QuickAction
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1v2M9 15v2M1 9h2M15 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>}
            label="Vault"
            href="/dashboard/vault"
          />
        </div>

        {/* Account Switcher */}
        <AccountSwitcher
          selectedAccountId={selectedAccountId}
          onSelect={handleAccountChange}
        />

        {!hasAccounts ? (
          <EmptyState />
        ) : !hasData ? (
          <NoTransactionsState />
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
                accent={stats.netCashflow >= 0 ? "teal" : "red"}
              />
              <StatCard
                label="Savings rate"
                value={`${Math.max(0, stats.savingsRate).toFixed(1)}%`}
                accent={
                  stats.savingsRate >= 20
                    ? "teal"
                    : stats.savingsRate >= 10
                    ? "amber"
                    : "red"
                }
              />
            </div>

            {/* Quick access */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickCard
                href="/dashboard/budgets"
                label="Budgets"
                color="teal"
                desc="Set category limits"
              />
              <QuickCard
                href="/dashboard/goals"
                label="Savings Goals"
                color="purple"
                desc="Track your targets"
              />
              <QuickCard
                href="/dashboard/bills"
                label="Bills"
                color="amber"
                desc="Upcoming due dates"
              />
              <QuickCard
                href="/dashboard/subscriptions"
                label="Subscriptions"
                color="pink"
                desc="Manage recurring"
              />
              <QuickCard
                href="/dashboard/net-worth"
                label="Net Worth"
                color="green"
                desc="Assets & liabilities"
              />
              <QuickCard
                href="/dashboard/debt"
                label="Debt Planner"
                color="red"
                desc="Payoff strategies"
              />
              <QuickCard
                href="/dashboard/investments"
                label="Investments"
                color="blue"
                desc="Stocks & crypto"
              />
              <QuickCard
                href="/dashboard/reports"
                label="Reports"
                color="indigo"
                desc="Monthly summaries"
              />
            </div>

            {/* Vault summary + Quick-add + Insight row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <VaultSummary />
              </div>
              <div className="md:col-span-3 space-y-4">
                <InsightCard />
                <QuickAddWidget />
              </div>
            </div>

            {/* Financial health score */}
            <HealthScoreWidget userId="" />

            {/* Cashflow ribbon */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Cashflow
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Income and expenses over time
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                    Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-200 inline-block dark:bg-slate-700" />
                    Expenses
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <CashflowRibbon data={cashflow} />
                </div>
              </div>
            </div>

            {/* Categories + Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="card p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">
                  Spending by category
                </h2>
                <CategoryChart data={categories} />
              </div>

              <div className="card p-5 lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Recent transactions
                  </h2>
                  <a
                    href="/dashboard/transactions"
                    className="text-xs text-teal-700 hover:underline dark:text-teal-400"
                  >
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

      {/* AI Chat Widget - shown on both mobile and desktop */}
      <ChatWidget />
    </>
  );
}

function QuickCard({
  href,
  label,
  desc,
  color,
}: {
  href: string;
  label: string;
  desc: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    pink: "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    indigo:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  };
  return (
    <a href={href} className="card p-4 card-hover block group">
      <p
        className={`text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors dark:text-slate-100 dark:group-hover:text-teal-400`}
      >
        {label}
      </p>
      <p className="text-2xs text-slate-400 mt-0.5">{desc}</p>
    </a>
  );
}

function HealthScoreWidget({ userId: _ }: { userId: string }) {
  const [score, setScore] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health-score")
      .then((r) => r.json())
      .then(setScore)
      .catch(() => {});
  }, []);

  if (!score) return null;

  const scoreColor =
    score.score >= 80
      ? "text-teal-700 dark:text-teal-400"
      : score.score >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-500";
  const strokeColor =
    score.score >= 80 ? "#0d7c66" : score.score >= 60 ? "#d97706" : "#ef4444";

  return (
    <a href="/dashboard/reports" className="card p-4 card-hover block">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide dark:text-slate-500">
            Financial health score
          </p>
          <p className={`text-2xl font-bold stat-number ${scoreColor}`}>
            {score.score}/100
          </p>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            {score.rating}
          </p>
        </div>
        <div className="w-16 h-16 relative">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              stroke={strokeColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray={`${score.score}, 100`}
            />
          </svg>
        </div>
      </div>
    </a>
  );
}

// ─── Insight of the day ────────────────────────────────────────────
function InsightCard() {
  const [insight, setInsight] = useState<{ summary: string; topInsight: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: 'month' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.analysis) {
          setInsight({ summary: d.analysis.summary, topInsight: d.analysis.topInsight })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card p-4">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-3 w-full mb-2" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    )
  }

  if (!insight) return null

  return (
    <a href="/dashboard/intelligence" className="card p-4 card-hover block group">
      <div className="flex items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-teal-600">
          <path d="M7 1.5L9 5l4 .5-3 3 .5 4L7 10.5 3.5 12.5l.5-4-3-3L5 5l2-3.5z" fill="currentColor" opacity="0.9"/>
        </svg>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
          Insight of the day
        </p>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
        {insight.topInsight}
      </p>
    </a>
  )
}

// ─── Quick-add widget ──────────────────────────────────────────────
function QuickAddWidget() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', direction: 'debit' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.description || !form.amount) { setError('Fill in all fields'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/manual-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, amount: parseFloat(form.amount), direction: form.direction }),
      })
      if (!res.ok) throw new Error('Failed')
      setShowForm(false)
      setForm({ description: '', amount: '', direction: 'debit' })
      router.refresh()
    } catch { setError('Failed to save') }
    setSaving(false)
  }

  if (!showForm) {
    return (
      <button id="quick-add-trigger" onClick={() => setShowForm(true)} className="card p-4 card-hover block w-full text-left group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center dark:bg-teal-950">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-teal-700 dark:text-teal-300">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors dark:text-slate-100 dark:group-hover:text-teal-300">
              Quick-add transaction
            </p>
            <p className="text-xs text-slate-400">Record a transaction manually</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">New transaction</p>
        <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <input type="text" placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="input text-sm" />
        </div>
        <div>
          <input type="number" step="0.01" placeholder="0.00" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className="input text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setForm({ ...form, direction: 'debit' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.direction === 'debit' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
          Expense
        </button>
        <button type="button" onClick={() => setForm({ ...form, direction: 'credit' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.direction === 'credit' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
          Income
        </button>
        <button type="submit" disabled={saving}
          className="ml-auto px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}

function NoTransactionsState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-teal-600"
        >
          <path
            d="M10 5v5l3 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="10"
            cy="10"
            r="7.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
        Account linked — no transactions yet
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 dark:text-slate-400">
        Your bank is connected. Transactions from the last 30 days will appear
        here once synced. Try syncing now.
      </p>
      <SyncButton />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-slate-400"
        >
          <rect
            x="2"
            y="4"
            width="16"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-slate-900 mb-2">
        No accounts linked
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
        Connect your bank account to start tracking your spending and get
        AI-powered insights.
      </p>
      <LinkBankButton />
    </div>
  );
}

function TransactionSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transactions/search?q=${encodeURIComponent(query)}&limit=6`)
        const data = await res.json()
        setResults(data.transactions || [])
        setShowResults(true)
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function highlight(text: string) {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((p, i) => p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-amber-100 dark:bg-amber-900/40 text-inherit rounded">{p}</mark>
      : p)
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search transactions... (e.g. 'Starbucks last month' or 'Amazon > $50')"
          className="input text-sm pl-9 py-2.5 w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-50">
          {results.map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {highlight(tx.merchantName || tx.description)}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(tx.date).toLocaleDateString()} · {tx.merchantCategory || 'Uncategorized'}
                </p>
              </div>
              <p className={`text-sm font-semibold ml-4 ${tx.direction === 'credit' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {tx.direction === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertBanner() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts?limit=3').then(r => r.json()).then(d => {
      setAlerts((d || []).filter((a: any) => !a.read).slice(0, 3))
      setLoading(false)
    }).catch(() => setLoading(false))

    // Generate proactive alerts on mount
    fetch('/api/alerts/generate', { method: 'POST' }).catch(() => {})
  }, [])

  if (loading || alerts.length === 0) return null

  const severityColors: Record<string, string> = {
    critical: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900/40',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900/40',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900/40',
  }
  const severityDots: Record<string, string> = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert: any) => (
        <div key={alert.id} className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${severityColors[alert.severity] || ''}`}>
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDots[alert.severity] || 'bg-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{alert.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</p>
          </div>
          <a href="/dashboard/alerts" className="text-xs text-teal-700 hover:underline shrink-0 dark:text-teal-400 mt-0.5">
            View
          </a>
        </div>
      ))}
    </div>
  )
}

function QuickAction({ icon, label, onClick, href }: { icon: React.ReactNode; label: string; onClick?: () => void; href?: string }) {
  const content = (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm transition-all cursor-pointer press-spring group">
      <span className="text-teal-600 dark:text-teal-400">{icon}</span>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">{label}</span>
    </div>
  )

  if (href) return <a href={href}>{content}</a>
  return <button onClick={onClick} type="button">{content}</button>
}

function VaultSummary() {
  const [vaults, setVaults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vault').then(r => r.json()).then(d => {
      setVaults(d.vaults || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="card p-4"><div className="skeleton h-16 w-full" /></div>
  }

  const total = vaults.reduce((s: number, v: any) => s + v.currentAmount, 0)

  if (vaults.length === 0) {
    return (
      <a href="/dashboard/vault" className="card p-4 card-hover block group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-white">
              <path d="M9 1v2M9 15v2M1 9h2M15 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">Savings Vault</p>
            <p className="text-xs text-slate-400">Start saving with auto round-ups</p>
          </div>
        </div>
      </a>
    )
  }

  return (
    <a href="/dashboard/vault" className="card p-4 card-hover block group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide dark:text-slate-500">Savings Vault</p>
        <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">{vaults.length} vault{vaults.length > 1 ? 's' : ''}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      <div className="flex gap-2 mt-2">
        {vaults.slice(0, 4).map((v: any) => (
          <div key={v.id} className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${
              v.color === 'teal' ? 'from-teal-500 to-teal-600' :
              v.color === 'purple' ? 'from-purple-500 to-purple-600' :
              v.color === 'pink' ? 'from-pink-500 to-pink-600' :
              v.color === 'amber' ? 'from-amber-500 to-amber-600' :
              'from-teal-500 to-teal-600'
            }`} style={{ width: v.targetAmount ? `${Math.min(100, (v.currentAmount / v.targetAmount) * 100)}%` : '100%' }} />
          </div>
        ))}
      </div>
    </a>
  )
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}
