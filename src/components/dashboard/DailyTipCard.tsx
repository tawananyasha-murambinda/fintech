'use client'

import { useCallback, useEffect, useState } from 'react'

// A fresh, AI-generated money tip for the dashboard. Every load (or tap of
// "New tip") hits /api/tips, which re-runs the model so the tip is unique
// instead of a cached one-size-fits-all line.
export function DailyTipCard() {
  const [tip, setTip] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tips')
      const d = await res.json()
      if (d?.tip) setTip(d.tip)
    } catch {
      // keep previous tip on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="card p-4">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-3 w-full mb-2" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Money tip
        </p>
        <button
          onClick={() => { setRefreshing(true); load() }}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-2xs font-semibold text-teal-700 hover:text-teal-600 transition-colors dark:text-teal-400 disabled:opacity-50"
        >
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {refreshing ? 'Thinking…' : 'New tip'}
        </button>
      </div>
      {tip ? (
        <p className="text-sm text-slate-700 leading-relaxed dark:text-slate-300">
          {tip}
        </p>
      ) : (
        <p className="text-sm text-slate-400">
          We couldn&apos;t fetch a tip right now — link an account and add some
          spending, then try again.
        </p>
      )}
    </div>
  )
}
