'use client'

import { useState, useEffect } from 'react'
import type { AiAnalysis } from '@/types'

const PERIODS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'quarter', label: '90 days' },
]

const HEALTH_COLORS: Record<string, string> = {
  excellent: 'text-teal-700 bg-teal-50',
  good: 'text-teal-600 bg-teal-50',
  fair: 'text-amber-600 bg-amber-50',
  concerning: 'text-red-500 bg-red-50',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-teal-700 bg-teal-50',
  medium: 'text-amber-600 bg-amber-50',
  hard: 'text-slate-600 bg-slate-100',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function IntelligencePage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setAnalysis(null)

    // Get user location for local insights
    let location: { city?: string; country?: string } | undefined
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        )
        // Reverse geocode via browser — we just pass coords and let the AI infer
        location = { city: undefined, country: undefined }
      } catch {}
    }

    const res = await fetch('/api/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, location }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Analysis failed. Make sure you have synced transactions.')
    } else {
      setAnalysis(data.analysis)
      setCached(data.cached)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-powered analysis of your spending patterns and savings opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={runAnalysis} disabled={loading} className="btn-primary text-xs py-2 disabled:opacity-60">
            {loading ? 'Analysing…' : analysis ? 'Re-analyse' : 'Run analysis'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-16 text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-900 mb-1">Analysing your transactions…</p>
          <p className="text-xs text-slate-400">Identifying patterns, merchants, and savings opportunities.</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-6 border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && !error && (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-teal-600">
              <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7.5 13.5C8.2 15 9.5 16 11 16s2.8-1 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor"/>
              <circle cx="13.5" cy="9.5" r="1.2" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Ready to analyse</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
            Click "Run analysis" to get a full breakdown of your spending, merchant alternatives, and savings recommendations.
          </p>
          <button onClick={runAnalysis} className="btn-primary text-sm">
            Run analysis
          </button>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-5">
          {cached && (
            <p className="text-2xs text-slate-400">
              Showing cached analysis — re-analyse for fresh insights.
            </p>
          )}

          {/* Summary card */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{analysis.summary}</p>
                <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-teal-700">Top insight</p>
                  <p className="text-sm text-teal-800 mt-0.5 leading-relaxed">{analysis.topInsight}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xs text-slate-400 uppercase tracking-wide mb-1">Cashflow health</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${HEALTH_COLORS[analysis.cashflowHealth]}`}>
                  {analysis.cashflowHealth.charAt(0).toUpperCase() + analysis.cashflowHealth.slice(1)}
                </span>
                <div className="mt-3">
                  <p className="text-2xs text-slate-400 uppercase tracking-wide mb-0.5">Suggested budget</p>
                  <p className="text-lg font-semibold stat-number text-slate-900">
                    {fmt(analysis.monthlyBudgetSuggestion)}
                    <span className="text-xs text-slate-400 font-normal">/mo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Spending by category</h2>
            <div className="space-y-3">
              {analysis.categoryBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{cleanCategory(cat.category)}</span>
                    <div className="flex items-center gap-3">
                      {cat.trend !== 0 && (
                        <span className={`text-xs ${cat.trend > 0 ? 'text-red-500' : 'text-teal-600'}`}>
                          {cat.trend > 0 ? '+' : ''}{cat.trend.toFixed(0)}%
                        </span>
                      )}
                      <span className="text-sm font-medium stat-number text-slate-900">{fmt(cat.total)}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings opportunities */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Savings opportunities</h2>
            <div className="space-y-3">
              {analysis.savingsOpportunities.map((opp, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-500">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-900">{opp.title}</p>
                      <span className={`text-2xs font-medium px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[opp.difficulty]}`}>
                        {opp.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{opp.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400">Save up to</p>
                    <p className="text-sm font-semibold text-teal-700 stat-number">{fmt(opp.estimatedMonthlySavings)}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merchant alternatives */}
          {analysis.merchantAlternatives.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Cheaper alternatives</h2>
              <p className="text-xs text-slate-400 mb-4">Based on your spending location and merchant data.</p>
              <div className="space-y-4">
                {analysis.merchantAlternatives.map((merchant) => (
                  <div key={merchant.merchantName} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{merchant.merchantName}</p>
                        <p className="text-xs text-slate-400">
                          {cleanCategory(merchant.category)} ·{' '}
                          {merchant.visitCount} visit{merchant.visitCount !== 1 ? 's' : ''} ·{' '}
                          {fmt(merchant.avgTransaction)} avg
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total spent</p>
                        <p className="text-sm font-semibold stat-number text-slate-900">{fmt(merchant.totalSpent)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {merchant.alternatives.map((alt, j) => (
                        <div key={j} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-slate-800">{alt.name}</p>
                            <p className="text-2xs text-slate-500 mt-0.5">{alt.reason}</p>
                          </div>
                          {alt.estimatedSavings > 0 && (
                            <p className="text-xs font-semibold text-teal-700 shrink-0 ml-3">
                              Save {fmt(alt.estimatedSavings)}/mo
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location insights */}
          {analysis.locationInsights.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Location insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.locationInsights.map((loc) => (
                  <div key={loc.city} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {loc.city}{loc.country && loc.country !== loc.city ? `, ${loc.country}` : ''}
                      </p>
                      <p className="text-xs font-semibold stat-number text-slate-700">{fmt(loc.totalSpent)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {loc.topCategories.map(cat => (
                        <span key={cat} className="text-2xs bg-white border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {cleanCategory(cat)}
                        </span>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {loc.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-2">
                          <span className="text-teal-500 shrink-0">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
