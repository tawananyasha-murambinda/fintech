'use client'

import { useState, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import type { AiAnalysis } from '@/types'

const PERIODS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'quarter', label: '90 days' },
]

const HEALTH_COLORS: Record<string, string> = {
  excellent: 'text-teal-700 bg-teal-50 dark:bg-teal-950 dark:text-teal-300',
  good: 'text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-300',
  fair: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
  concerning: 'text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-teal-700 bg-teal-50 dark:bg-teal-950 dark:text-teal-300',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
  hard: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
}

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function IntelligencePage() {
  const { format: fmt } = useCurrency()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setAnalysis(null)

    const res = await fetch('/api/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
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
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            AI-powered analysis of your spending patterns and savings opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
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
          <p className="text-sm font-medium text-slate-900 mb-1 dark:text-slate-100">Analysing your transactions…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Identifying patterns, merchants, and savings opportunities.</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-6 border-red-100 dark:border-red-900/40">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && !error && (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4 dark:bg-teal-950">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-teal-600 dark:text-teal-400">
              <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7.5 13.5C8.2 15 9.5 16 11 16s2.8-1 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor"/>
              <circle cx="13.5" cy="9.5" r="1.2" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Ready to analyse</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5 dark:text-slate-400">
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
            <p className="text-2xs text-slate-400 dark:text-slate-500">
              Showing cached analysis — re-analyse for fresh insights.
            </p>
          )}

          {/* Summary card */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 dark:text-slate-500">Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3 dark:text-slate-300">{analysis.summary}</p>
                <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-3 dark:bg-teal-950 dark:border-teal-900/40">
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Top insight</p>
                  <p className="text-sm text-teal-800 mt-0.5 leading-relaxed dark:text-teal-200">{analysis.topInsight}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xs text-slate-400 uppercase tracking-wide mb-1 dark:text-slate-500">Cashflow health</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${HEALTH_COLORS[analysis.cashflowHealth]}`}>
                  {analysis.cashflowHealth.charAt(0).toUpperCase() + analysis.cashflowHealth.slice(1)}
                </span>
                <div className="mt-3">
                  <p className="text-2xs text-slate-400 uppercase tracking-wide mb-0.5 dark:text-slate-500">Suggested budget</p>
                  <p className="text-lg font-semibold stat-number text-slate-900 dark:text-slate-100">
                    {fmt(analysis.monthlyBudgetSuggestion)}
                    <span className="text-xs text-slate-400 font-normal dark:text-slate-500">/mo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Spending by category</h2>
            <div className="space-y-3">
              {analysis.categoryBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{cleanCategory(cat.category)}</span>
                    <div className="flex items-center gap-3">
                      {cat.trend !== 0 && (
                        <span className={`text-xs ${cat.trend > 0 ? 'text-red-500 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          {cat.trend > 0 ? '+' : ''}{cat.trend.toFixed(0)}%
                        </span>
                      )}
                      <span className="text-sm font-medium stat-number text-slate-900 dark:text-slate-100">{fmt(cat.total)}</span>
                      <span className="text-xs text-slate-400 w-8 text-right dark:text-slate-500">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
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
            <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Savings opportunities</h2>
            <div className="space-y-3">
              {analysis.savingsOpportunities.map((opp, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl dark:bg-slate-800">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center dark:bg-slate-900 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{opp.title}</p>
                      <span className={`text-2xs font-medium px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[opp.difficulty]}`}>
                        {opp.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">{opp.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Save up to</p>
                    <p className="text-sm font-semibold text-teal-700 stat-number dark:text-teal-400">{fmt(opp.estimatedMonthlySavings)}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merchant alternatives */}
          {analysis.merchantAlternatives.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Cheaper alternatives</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">Based on your spending location and merchant data.</p>
              <div className="space-y-4">
                {analysis.merchantAlternatives.map((merchant) => (
                  <div key={merchant.merchantName} className="border border-slate-100 rounded-xl p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{merchant.merchantName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {cleanCategory(merchant.category)} ·{' '}
                          {merchant.visitCount} visit{merchant.visitCount !== 1 ? 's' : ''} ·{' '}
                          {fmt(merchant.avgTransaction)} avg
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 dark:text-slate-500">Total spent</p>
                        <p className="text-sm font-semibold stat-number text-slate-900 dark:text-slate-100">{fmt(merchant.totalSpent)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {merchant.alternatives.map((alt, j) => (
                        <div key={j} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 dark:bg-slate-800">
                          <div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{alt.name}</p>
                            <p className="text-2xs text-slate-500 mt-0.5 dark:text-slate-400">{alt.reason}</p>
                          </div>
                          {alt.estimatedSavings > 0 && (
                            <p className="text-xs font-semibold text-teal-700 shrink-0 ml-3 dark:text-teal-400">
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
              <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Location insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.locationInsights.map((loc) => (
                  <div key={loc.city} className="bg-slate-50 rounded-xl p-4 dark:bg-slate-800">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {loc.city}{loc.country && loc.country !== loc.city ? `, ${loc.country}` : ''}
                      </p>
                      <p className="text-xs font-semibold stat-number text-slate-700 dark:text-slate-300">{fmt(loc.totalSpent)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {loc.topCategories.map(cat => (
                        <span key={cat} className="text-2xs bg-white border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                          {cleanCategory(cat)}
                        </span>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {loc.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-2 dark:text-slate-400">
                          <span className="text-teal-500 shrink-0 dark:text-teal-400">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sustainability score */}
          {analysis.sustainabilityScore !== undefined && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sustainability score</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Estimated based on your spending categories</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold stat-number ${analysis.sustainabilityScore >= 70 ? 'text-teal-600 dark:text-teal-400' : analysis.sustainabilityScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                    {analysis.sustainabilityScore}/100
                  </p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 via-amber-500 to-teal-600"
                  style={{ width: `${analysis.sustainabilityScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Subscription overlaps */}
          {analysis.subscriptionOverlaps.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Subscription overlap detector</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">Services you may be double-paying for.</p>
              <div className="space-y-3">
                {analysis.subscriptionOverlaps.map((overlap, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{overlap.category}</p>
                      <p className="text-xs font-semibold text-red-500 dark:text-red-400">{fmt(overlap.totalMonthly)}/mo</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {overlap.merchants.map((m) => (
                        <span key={m.name} className="text-2xs bg-white border border-slate-100 text-slate-500 px-2 py-1 rounded dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                          {m.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{overlap.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring trends */}
          {analysis.recurringTrends.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Recurring charge trends</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">Merchants whose costs are changing over time.</p>
              <div className="space-y-2">
                {analysis.recurringTrends.map((trend, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{trend.merchantName}</p>
                      <p className="text-2xs text-slate-500 dark:text-slate-400">{trend.transactionCount} transactions · avg {fmt(trend.avgAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${trend.trendPercent > 0 ? 'text-red-500 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>
                        {trend.trendPercent > 0 ? '+' : ''}{trend.trendPercent.toFixed(1)}%
                      </p>
                      <p className="text-2xs text-slate-500 dark:text-slate-400">{trend.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden recurring charges */}
          {analysis.hiddenRecurringCharges.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Detected recurring charges</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">Charges that appear on a regular pattern.</p>
              <div className="space-y-2">
                {analysis.hiddenRecurringCharges.map((charge, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{charge.merchantName}</p>
                      <p className="text-2xs text-slate-500 dark:text-slate-400">{charge.frequency} · first seen {new Date(charge.detectedAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(charge.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merchant concentration risk */}
          {analysis.merchantConcentrationRisk.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Merchant concentration risk</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">How dependent you are on single merchants.</p>
              <div className="space-y-2">
                {analysis.merchantConcentrationRisk.map((risk, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{risk.merchantName}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${
                        risk.riskLevel === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                        risk.riskLevel === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {risk.riskLevel}
                      </span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{risk.percentOfExpenses.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spending patterns */}
          {analysis.spendingPatterns.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Spending patterns</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.spendingPatterns.map((pattern, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 dark:bg-slate-800">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">{pattern.title}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pattern.value}</p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{pattern.description}</p>
                    <p className="text-xs text-teal-700 mt-2 dark:text-teal-400">{pattern.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What-if simulator */}
          {analysis.whatIfScenarios.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">What-if simulator</h2>
              <p className="text-xs text-slate-400 mb-4 dark:text-slate-500">Small changes and their projected impact.</p>
              <div className="space-y-3">
                {analysis.whatIfScenarios.map((scenario, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl dark:bg-slate-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{scenario.label}</p>
                        <span className={`text-2xs font-medium px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[scenario.difficulty]}`}>
                          {scenario.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{scenario.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">+{fmt(scenario.monthlyImpact)}/mo</p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">+{fmt(scenario.yearlyImpact)}/yr</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cashflow forecast */}
          {analysis.cashflowForecast.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">14-day cashflow forecast</h2>
              <div className="h-48">
                <div className="flex items-end gap-1 h-32 mb-3">
                  {analysis.cashflowForecast.map((day, i) => {
                    const max = Math.max(...analysis.cashflowForecast.map((d) => Math.abs(d.predictedBalance)), 1)
                    const h = Math.min(100, Math.max(10, (Math.abs(day.predictedBalance) / max) * 100))
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className={`w-full rounded-t transition-all ${day.predictedBalance >= 0 ? 'bg-teal-600 dark:bg-teal-500' : 'bg-red-400 dark:bg-red-500'}`}
                          style={{ height: `${h}%` }}
                        />
                        <p className="text-2xs text-slate-400 opacity-0 group-hover:opacity-100 absolute -mt-16 bg-slate-900 text-white px-1.5 py-0.5 rounded dark:bg-slate-700">
                          {fmt(day.predictedBalance)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500">
                  <span>{new Date(analysis.cashflowForecast[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(analysis.cashflowForecast[analysis.cashflowForecast.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
