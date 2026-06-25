'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResult(`${data.transactions} new`)
        router.refresh()
      } else {
        setResult(data.error || 'Sync failed')
      }
    } catch {
      setResult('Sync failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setResult(null), 3000)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="btn-secondary flex items-center gap-2 text-xs py-2"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        className={syncing ? 'animate-spin' : ''}
      >
        <path
          d="M11.5 6.5A5 5 0 1 1 6.5 1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M9 1.5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {syncing ? 'Syncing…' : result || 'Sync'}
    </button>
  )
}
