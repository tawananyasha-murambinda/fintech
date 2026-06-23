'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: {
        applicationId: string
        environment?: string
        onInit?: () => void
        onSuccess: (enrollment: { accessToken: string; user: { id: string } }) => void
        onExit?: () => void
        onFailure?: (err: unknown) => void
      }) => { open: () => void; destroy: () => void }
    }
  }
}

export function LinkBankButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (document.getElementById('teller-connect-script')) {
      setReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'teller-connect-script'
    script.src = 'https://cdn.teller.io/connect/connect.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [])

  const handleClick = useCallback(() => {
    if (!ready || !window.TellerConnect) return

    const tc = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID || '',
      environment: (process.env.NEXT_PUBLIC_TELLER_ENV as any) || 'sandbox',
      onSuccess: async (enrollment) => {
        setLoading(true)
        try {
          const res = await fetch('/api/teller/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: enrollment.accessToken }),
          })
          if (res.ok) {
            router.refresh()
            // Trigger immediate sync
            await fetch('/api/teller/sync', { method: 'POST' })
            router.refresh()
          }
        } finally {
          setLoading(false)
          tc.destroy()
        }
      },
      onExit: () => tc.destroy(),
    })

    tc.open()
  }, [ready, router])

  return (
    <button
      onClick={handleClick}
      disabled={loading || !ready}
      className="btn-primary flex items-center gap-2 text-xs py-2 disabled:opacity-60"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      {loading ? 'Linking…' : 'Link account'}
    </button>
  )
}
