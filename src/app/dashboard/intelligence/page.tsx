'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { detectUserLocation, saveUserLocation, getUserLocation } from '@/lib/location'
import { GradientHeader } from '@/components/layout/GradientHeader'
import { Disclosure } from '@/components/ui/Disclosure'
import type { AiAnalysis } from '@/types'

const PERIODS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'quarter', label: '90 days' },
]

const CATEGORY_COLORS = [
  'from-slate-800 to-slate-800',
  'from-slate-700 to-slate-700',
  'from-slate-600 to-slate-600',
  'from-slate-500 to-slate-500',
  'from-slate-400 to-slate-400',
  'from-blue-700 to-blue-700',
  'from-blue-600 to-blue-600',
  'from-blue-500 to-blue-500',
  'from-blue-400 to-blue-400',
  'from-slate-300 to-slate-300',
]

const CATEGORY_HEX_COLORS = [
  '#1e293b',
  '#334155',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#1848d6',
  '#1e5eff',
  '#5c85ff',
  '#8fadff',
  '#cbd5e1',
]

const CATEGORY_BG_CLASSES = [
  'bg-slate-800',
  'bg-slate-700',
  'bg-slate-600',
  'bg-slate-500',
  'bg-slate-400',
  'bg-blue-700',
  'bg-blue-600',
  'bg-blue-500',
  'bg-blue-400',
  'bg-slate-300',
]

function cleanCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function DonutChart({ segments, size = 140 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const strokeWidth = size * 0.09
  const gap = 0.02

  let currentAngle = -Math.PI / 2
  const paths = segments.map((seg) => {
    const fraction = seg.value / total
    const sweepAngle = fraction * Math.PI * 2
    const startAngle = currentAngle
    const endAngle = currentAngle + sweepAngle * (1 - gap)
    currentAngle += sweepAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = sweepAngle > Math.PI ? 1 : 0

    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: seg.color,
      strokeWidth,
    }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.color} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--bg-card, #fff)" />
    </svg>
  )
}

function HealthRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = size * 0.4
  const circumference = 2 * Math.PI * r
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference
  const color = score >= 80 ? '#0d9488' : score >= 60 ? '#d97706' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.06} className="text-slate-100 dark:text-slate-800" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.06} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700 ease-out" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return null
  const isUp = trend > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
      isUp ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400'
    }`}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={isUp ? '' : 'rotate-180'}>
        <path d="M4 1v6M1 4l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {isUp ? '+' : ''}{trend.toFixed(0)}%
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
    medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    hard: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  return <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${colors[difficulty] || ''}`}>{difficulty}</span>
}

export default function IntelligencePage() {
  const { format: fmt } = useCurrency()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)
  const [userLocation, setUserLocation] = useState<{ city?: string; country?: string; latitude?: number; longitude?: number } | null>(null)
  const [locationPrompt, setLocationPrompt] = useState<'off' | 'detecting' | 'done'>('off')

  useEffect(() => {
    const tracking = localStorage.getItem('location_tracking') === 'true'
    if (!tracking) return
    getUserLocation().then(async (loc) => {
      if (loc?.city) {
        setUserLocation(loc)
      } else {
        setLocationPrompt('detecting')
        const detected = await detectUserLocation()
        if (detected) {
          await saveUserLocation(detected)
          setUserLocation(detected)
          setLocationPrompt('done')
        } else {
          setLocationPrompt('off')
        }
      }
    })
  }, [])

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setAnalysis(null)

    const body: any = { period, forceRefresh: true }
    if (userLocation?.city) {
      body.location = { city: userLocation.city, country: userLocation.country }
    }

    const res = await fetch('/api/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  const donutSegments = useMemo(() => {
    if (!analysis) return []
    return analysis.categoryBreakdown.slice(0, 8).map((cat, i) => ({
      value: cat.total,
      color: CATEGORY_HEX_COLORS[i % CATEGORY_HEX_COLORS.length],
      label: cat.category,
    }))
  }, [analysis])

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Mobile gradient header */}
      <div className="lg:hidden">
        <GradientHeader title="Insights" subtitle="Spending breakdown" />
      </div>
      {/* Header */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            A clear breakdown of your spending and where you could save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={runAnalysis} disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-all press-spring shadow-sm">
            {loading ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing…</>
            ) : analysis ? 'Re-analyse' : 'Run analysis'}
          </button>
        </div>
      </div>

      {/* Mobile controls */}
      <div className="lg:hidden flex items-center gap-2 -mt-2">
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900 flex-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value as any)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p.value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={runAnalysis} disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white disabled:opacity-60 shadow-sm">
          {loading ? 'Analysing…' : analysis ? 'Re-analyse' : 'Run analysis'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-900 mb-1 dark:text-slate-100">Analysing your transactions…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Identifying patterns, merchants, and savings opportunities.</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-5">
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Location prompt */}
      {!loading && !analysis && !error && !userLocation && (
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 dark:bg-amber-900/40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-700 dark:text-amber-400">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable location for smarter alternatives</p>
              <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                Set your city to get hyper-local recommendations — specific bus lines, nearby supermarkets, and route details tailored to where you live.
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />Know which bus line to take instead of Uber, with exact fare estimates</li>
                <li className="text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />Find the nearest discount supermarket to cook at home instead of eating out</li>
                <li className="text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />Get walking/cycling estimates with time and distance comparisons</li>
              </ul>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={async () => {
                  setLocationPrompt('detecting')
                  const loc = await detectUserLocation()
                  if (loc) {
                    await saveUserLocation(loc)
                    setUserLocation(loc)
                    localStorage.setItem('location_tracking', 'true')
                    setLocationPrompt('done')
                  } else { setLocationPrompt('off') }
                }} disabled={locationPrompt === 'detecting'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50">
                  {locationPrompt === 'detecting' ? 'Detecting…' : 'Detect my location'}
                </button>
                <a href="/dashboard/settings" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">Open Settings</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && !error && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white dark:text-slate-900">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8.5 14.5C9.2 16 10.5 17 12 17s2.8-1 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/>
              <circle cx="14.5" cy="10.5" r="1.2" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">Ready to analyse</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Click "Run analysis" to get a full breakdown of your spending, merchant alternatives, and savings recommendations.
            {userLocation?.city && ` Using location: ${userLocation.city}${userLocation.country ? `, ${userLocation.country}` : ''}.`}
          </p>
          <button onClick={runAnalysis} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
            Run analysis
          </button>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <>
          {cached && (
            <div className="flex items-center gap-2 text-2xs text-slate-400 dark:text-slate-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5V6l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Cached — re-analyse for fresh insights.
            </div>
          )}

          {/* ─── HERO: Summary + Health + Budget ─── */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-600 dark:text-slate-300"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Financial snapshot</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{analysis.summary}</p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-teal-100 dark:border-teal-900/40">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white dark:text-slate-900"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div>
                        <p className="text-2xs font-semibold text-teal-600 dark:text-teal-400">Top insight</p>
                        <p className="text-sm text-teal-800 dark:text-teal-200 mt-0.5 leading-relaxed">{analysis.topInsight}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mb-2">Financial health</p>
                    <HealthRing score={analysis.sustainabilityScore ?? 50} size={96} />
                  </div>
                  <div className="text-center">
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mb-1">Suggested budget</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmt(analysis.monthlyBudgetSuggestion)}<span className="text-xs text-slate-400 font-normal dark:text-slate-500">/mo</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Health metrics bar */}
            <div className="grid grid-cols-4 border-t border-slate-100 dark:border-slate-800 mt-6">
              {[
                { label: 'Cashflow health', value: analysis.cashflowHealth.charAt(0).toUpperCase() + analysis.cashflowHealth.slice(1), color: analysis.cashflowHealth === 'excellent' || analysis.cashflowHealth === 'good' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400', dot: analysis.cashflowHealth === 'excellent' || analysis.cashflowHealth === 'good' ? 'bg-teal-500' : 'bg-amber-500' },
                { label: 'Categories tracked', value: `${analysis.categoryBreakdown.length}`, color: 'text-slate-900 dark:text-slate-100' },
                { label: 'Merchants analysed', value: `${analysis.merchantAlternatives.length}`, color: 'text-slate-900 dark:text-slate-100' },
                { label: 'Savings found', value: `${analysis.savingsOpportunities.length}`, color: 'text-teal-600 dark:text-teal-400' },
              ].map((m, i) => (
                <div key={i} className="px-5 py-3.5 border-r border-slate-100 dark:border-slate-800 last:border-0">
                  <p className="text-2xs text-slate-400 dark:text-slate-500 mb-0.5">{m.label}</p>
                  <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── CATEGORY BREAKDOWN ─── */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Spending by category</h2>
              <div className="flex items-center gap-2 text-2xs text-slate-400 dark:text-slate-500">
                <span className="w-2 h-2 rounded-full bg-teal-500" /> vs previous period
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-start gap-8">
              <div className="shrink-0 mx-auto lg:mx-0">
                <DonutChart segments={donutSegments} size={160} />
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {analysis.categoryBreakdown.slice(0, 8).map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_BG_CLASSES[i % CATEGORY_BG_CLASSES.length]}`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{cleanCategory(cat.category)}</span>
                        {cat.trend !== 0 && <TrendBadge trend={cat.trend} />}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(cat.total)}</span>
                        <span className="text-xs text-slate-400 w-8 text-right dark:text-slate-500">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── SAVINGS OPPORTUNITIES ─── */}
          {analysis.savingsOpportunities.length > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-400">
                    <path d="M12 2v10l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M4.93 4.93a10 10 0 1114.14 14.14A10 10 0 014.93 4.93z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Savings opportunities</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 ml-8 dark:text-slate-500">Actionable ways to reduce spending</p>
              <div className="space-y-2">
                {analysis.savingsOpportunities.map((opp, i) => (
                  <Disclosure
                    key={i}
                    title={
                      <span className="flex items-center gap-2">
                        <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-2xs font-bold">{i + 1}</span>
                        <span className="truncate">{opp.title}</span>
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                      opp.difficulty === 'easy' ? 'bg-slate-900 dark:bg-slate-100' :
                      opp.difficulty === 'medium' ? 'bg-slate-900 dark:bg-slate-100' :
                      'bg-slate-900 dark:bg-slate-100'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{opp.title}</p>
                        <DifficultyBadge difficulty={opp.difficulty} />
                      </span>
                    }
                    value={<span className="text-teal-600 dark:text-teal-400">{fmt(opp.estimatedMonthlySavings)}/mo</span>}
                  >
                    {opp.description}
                  </Disclosure>
                ))}
              </div>
            </div>
          )}

          {/* ─── TWO-COLUMN LAYOUT: Patterns + What-if ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Spending patterns */}
            {analysis.spendingPatterns.length > 0 && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-600 dark:text-indigo-400"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 16l4-8 4 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Spending patterns</h2>
                </div>
                <div className="space-y-2.5">
                  {analysis.spendingPatterns.map((pattern, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500">{pattern.title}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{pattern.value}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{pattern.description}</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">{pattern.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What-if scenarios */}
            {analysis.whatIfScenarios.length > 0 && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">What-if simulator</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4 ml-8 dark:text-slate-500">Small changes, big impact over time</p>
                <div className="space-y-2.5">
                  {analysis.whatIfScenarios.map((scenario, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{scenario.label}</p>
                          <DifficultyBadge difficulty={scenario.difficulty} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{scenario.description}</p>
                      </div>
                      <div className="shrink-0 text-right ml-4">
                        <p className="text-sm font-bold text-teal-600 dark:text-teal-400">+{fmt(scenario.monthlyImpact)}<span className="text-xs font-normal text-teal-500">/mo</span></p>
                        <p className="text-2xs text-slate-400 dark:text-slate-500">+{fmt(scenario.yearlyImpact)}<span className="text-slate-400">/yr</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── MERCHANT ALTERNATIVES ─── */}
          {analysis.merchantAlternatives.length > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-600 dark:text-emerald-400"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Location-smart alternatives</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 ml-8 dark:text-slate-500">Personalized recommendations based on your city and local merchants.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.merchantAlternatives.map((merchant) => {
                  const primary = merchant.alternatives.find(a => a.type === 'primary')
                  const secondary = merchant.alternatives.filter(a => a.type === 'secondary')
                  return (
                    <div key={merchant.merchantName} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{merchant.merchantName}</p>
                          <p className="text-2xs text-slate-400 mt-0.5 dark:text-slate-500">
                            {cleanCategory(merchant.category)} · {merchant.visitCount} visit{merchant.visitCount !== 1 ? 's' : ''} · avg {fmt(merchant.avgTransaction)}
                            {merchant.locationContext && <span className="ml-1.5 text-emerald-500">· {merchant.locationContext.replace('You live in ', '')}</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right ml-3">
                          <p className="text-2xs text-slate-400 dark:text-slate-500">Total</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(merchant.totalSpent)}</p>
                        </div>
                      </div>

                      {/* API error warning */}
                      {merchant.error && (
                        <div className="mb-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 flex items-start gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-amber-500 shrink-0 mt-0.5" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
                          <p className="text-2xs text-amber-700 dark:text-amber-400">{merchant.error}</p>
                        </div>
                      )}

                      {/* Primary recommendation — featured */}
                      {primary && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-3 mb-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0 mt-0.5">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-600 dark:text-emerald-400"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{primary.name}</p>
                                  {primary.detail && (
                                    <p className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{primary.detail}</p>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmt(primary.estimatedSavings)}</p>
                                  <p className="text-2xs text-emerald-500">savings</p>
                                </div>
                              </div>
                              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{primary.reason}</p>
                              {primary.distance && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-2xs font-medium text-slate-400 dark:text-slate-500">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  {primary.distance}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Secondary alternatives */}
                      {secondary.length > 0 && (
                        <div className="space-y-1">
                          {secondary.map((alt, j) => (
                            <div key={j} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 px-3 py-2 border border-slate-100 dark:border-slate-700">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xs text-slate-400 dark:text-slate-500 font-medium">Also</span>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{alt.name}</p>
                                </div>
                                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-px truncate">{alt.reason}</p>
                              </div>
                              {alt.estimatedSavings > 0 && (
                                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 shrink-0 ml-3">
                                  {fmt(alt.estimatedSavings)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── THREE-COLUMN MINI CARDS: Subscriptions, Recurring, Hidden ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Subscription overlaps */}
            {analysis.subscriptionOverlaps.length > 0 && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-rose-600 dark:text-rose-400"><path d="M20 12H4M12 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Subscription overlap</p>
                </div>
                <div className="space-y-2">
                  {analysis.subscriptionOverlaps.map((overlap, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{overlap.category}</span>
                        <span className="text-xs font-bold text-rose-500 dark:text-rose-400">{fmt(overlap.totalMonthly)}/mo</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {overlap.merchants.map(m => (
                          <span key={m.name} className="text-2xs bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{m.name}</span>
                        ))}
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">{overlap.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring trends */}
            {analysis.recurringTrends.length > 0 && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-amber-600 dark:text-amber-400"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.51 9a9 9 0 1114.85 3.36L23 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Price changes</p>
                </div>
                <div className="space-y-2">
                  {analysis.recurringTrends.map((trend, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{trend.merchantName}</p>
                        <p className="text-2xs text-slate-400 dark:text-slate-500">{trend.transactionCount} tx · avg {fmt(trend.avgAmount)}</p>
                      </div>
                      <div className="shrink-0 text-right ml-3">
                        <p className={`text-xs font-bold ${trend.trendPercent > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          {trend.trendPercent > 0 ? '+' : ''}{trend.trendPercent.toFixed(1)}%
                        </p>
                        <p className="text-2xs text-slate-400 dark:text-slate-500">{trend.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden recurring charges + Merchant concentration */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              {analysis.hiddenRecurringCharges.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-purple-600 dark:text-purple-400"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Recurring charges</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    {analysis.hiddenRecurringCharges.slice(0, 4).map((charge, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{charge.merchantName}</p>
                          <p className="text-2xs text-slate-400 dark:text-slate-500">{charge.frequency}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{fmt(charge.amount)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Merchant concentration */}
              {analysis.merchantConcentrationRisk.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-orange-600 dark:text-orange-400"><path d="M12 20V10M18 20V4M6 20v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Concentration risk</p>
                  </div>
                  <div className="space-y-2">
                    {analysis.merchantConcentrationRisk.slice(0, 4).map((risk, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{risk.merchantName}</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{risk.percentOfExpenses.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                          <div className={`h-full rounded-full ${risk.riskLevel === 'high' ? 'bg-rose-500' : risk.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-teal-500'}`}
                            style={{ width: `${Math.min(100, risk.percentOfExpenses)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── LOCATION INSIGHTS ─── */}
          {analysis.locationInsights.length > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-600 dark:text-emerald-400"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Location insights</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 ml-8 dark:text-slate-500">Where your money goes</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.locationInsights.map((loc) => (
                  <div key={loc.city} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {loc.city}{loc.country && loc.country !== loc.city ? `, ${loc.country}` : ''}
                      </p>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{fmt(loc.totalSpent)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {loc.topCategories.map(cat => (
                        <span key={cat} className="text-2xs bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{cleanCategory(cat)}</span>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {loc.suggestions.slice(0, 2).map((s, i) => (
                        <li key={i} className="text-2xs text-slate-600 dark:text-slate-400 flex gap-1.5">
                          <span className="text-teal-500 shrink-0 dark:text-teal-400 mt-px">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── CASHFLOW FORECAST ─── */}
          {analysis.cashflowForecast.length > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-cyan-600 dark:text-cyan-400"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 20l4-8 4 4 4-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">14-day cashflow forecast</h2>
              </div>
              <div className="relative">
                <div className="flex items-end gap-[3px] h-36 mb-2">
                  {(() => {
                    const vals = analysis.cashflowForecast
                    const min = Math.min(...vals.map(d => d.predictedBalance), 0)
                    const max = Math.max(...vals.map(d => d.predictedBalance), 1)
                    const range = max - min || 1
                    const startVal = vals[0].predictedBalance
                    return vals.map((day, i) => {
                      const h = ((day.predictedBalance - min) / range) * 100
                      const isStart = i === 0
                      const isEnd = i === vals.length - 1
                      const isNeg = day.predictedBalance < 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div
                            className={`w-full rounded-sm transition-all duration-300 ${
                              isNeg ? 'bg-rose-400 dark:bg-rose-500' : isStart ? 'bg-teal-500' : 'bg-teal-600 dark:bg-teal-500'
                            } ${isEnd ? 'rounded-t-md' : ''}`}
                            style={{ height: `${Math.max(2, h)}%` }}
                          />
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-2xs bg-slate-900 dark:bg-slate-700 text-white px-1.5 py-0.5 rounded whitespace-nowrap">{fmt(day.predictedBalance)}</span>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
                {/* Zero line */}
                {(() => {
                  const vals = analysis.cashflowForecast
                  const min = Math.min(...vals.map(d => d.predictedBalance), 0)
                  const max = Math.max(...vals.map(d => d.predictedBalance), 1)
                  const range = max - min || 1
                  const zeroH = ((0 - min) / range) * 100
                  return (
                    <div className="absolute left-0 right-0 border-t border-dashed border-slate-200 dark:border-slate-700 pointer-events-none" style={{ bottom: `${zeroH}%` }} />
                  )
                })()}
                {/* Date labels */}
                <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500">
                  <span>{new Date(analysis.cashflowForecast[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(analysis.cashflowForecast[analysis.cashflowForecast.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
