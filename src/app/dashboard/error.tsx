'use client'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
