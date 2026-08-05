'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'fintrack_consent_v1'

export function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY))
    } catch {
      setVisible(true)
    }
  }, [])

  async function record(type: string, granted: boolean) {
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, granted, version: 'v1' }),
      })
    } catch {
      // Anonymous or offline visitors are handled client-side only.
    }
  }

  function choose(granted: boolean) {
    record('cookies', true)
    record('analytics', granted)
    record('marketing', false)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: granted, at: Date.now() }))
      localStorage.setItem('privacy_analytics', String(granted))
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none"
    >
      <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 pointer-events-auto">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">We value your privacy</h2>
        <p className="text-xs text-slate-500 leading-relaxed mt-1.5 dark:text-slate-400">
          We use strictly necessary cookies to keep you signed in and secure. With your permission we
          also use anonymous analytics to improve the app. We never sell your data. See our{' '}
          <Link href="/legal/cookies" className="text-teal-700 underline dark:text-teal-400">Cookie Policy</Link> and{' '}
          <Link href="/legal/privacy" className="text-teal-700 underline dark:text-teal-400">Privacy Policy</Link>.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => choose(true)} className="btn-primary text-xs flex-1">
            Accept all
          </button>
          <button
            onClick={() => choose(false)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Necessary only
          </button>
        </div>
      </div>
    </div>
  )
}
