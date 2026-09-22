'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Health {
  status: 'ok' | 'degraded'
  service: string
  version: string
  uptime: number
  time: string
  checks: { database: 'ok' | 'error'; configuration?: 'ok' | 'incomplete' }
  configuration?: {
    missingCritical: { key: string; impact: string }[]
    missingDegraded: { key: string; impact: string }[]
    missingOptional: string[]
  }
}

export default function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        // A degraded deployment answers 503 with a body worth reading, so the
        // response is parsed either way rather than treated as a failure.
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = await res.json()
        if (active) {
          setHealth(data)
          setError(false)
        }
      } catch {
        if (active) setError(true)
      }
    }

    poll()
    const id = setInterval(poll, 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const ok = health?.status === 'ok'

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-xl mx-auto px-4 py-16 sm:px-6">
        <nav className="mb-12 flex items-center gap-5 text-sm">
          <Link href="/" className="font-semibold text-teal-700 hover:underline dark:text-teal-400">FinTrack</Link>
          <Link href="/auth/login" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">Sign in</Link>
          <Link href="/help" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">Help</Link>
        </nav>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <div
            className={`w-4 h-4 rounded-full mx-auto mb-4 ${
              error ? 'bg-amber-500' : ok ? 'bg-teal-500 animate-pulse' : 'bg-red-500'
            }`}
            role="status"
            aria-label={error ? 'Checking' : ok ? 'Operational' : 'Degraded'}
          />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {error ? 'Checking status…' : ok ? 'All systems operational' : 'Partial outage'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 dark:text-slate-400">
            {error
              ? 'We could not reach the API right now.'
              : health?.checks.database === 'ok'
                ? 'The API and database are responding normally.'
                : 'The API is up but the database is unreachable.'}
          </p>
        </div>

        {health?.configuration &&
          (health.configuration.missingCritical.length > 0 ||
            health.configuration.missingDegraded.length > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                Some features are switched off
              </p>
              <ul className="space-y-2">
                {[...health.configuration.missingCritical, ...health.configuration.missingDegraded].map(
                  (gap) => (
                    <li key={gap.key} className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                      <code className="font-mono font-semibold">{gap.key}</code> is not set — {gap.impact}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

        {health && (
          <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Service</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{health.service}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Version</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{health.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Database</span>
              <span className={`text-sm font-medium ${health.checks.database === 'ok' ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                {health.checks.database === 'ok' ? 'Operational' : 'Unreachable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Last check</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {new Date(health.time).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mt-8 dark:text-slate-500">
          Auto-refreshes every 30 seconds.
        </p>
      </div>
    </div>
  )
}
