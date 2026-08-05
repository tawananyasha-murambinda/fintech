'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch('/api/monitoring/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'dashboard',
        message: error.message || 'Unknown dashboard error',
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-500">{error.message || 'Failed to load this page.'}</p>
        {error.digest && <p className="text-xs text-slate-400 font-mono">{error.digest}</p>}
        <button
          onClick={reset}
          className="btn-primary text-xs"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
