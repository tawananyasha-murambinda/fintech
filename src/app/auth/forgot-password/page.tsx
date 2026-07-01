'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setSent(true)
    } else {
      setError(data.error || 'Something went wrong.')
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4L12 14 2 4" /><path d="M2 4h20v16H2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Check your email</h1>
          <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
            If an account exists for <strong className="text-slate-700 dark:text-slate-300">{email}</strong>, we&apos;ve sent a reset link.
          </p>
          <div className="mt-6">
            <button onClick={() => setSent(false)} className="text-sm text-teal-700 hover:underline dark:text-teal-400">
              Use a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Forgot password</h1>
          <p className="text-sm text-slate-500 mt-1.5 dark:text-slate-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300 dark:border-red-900/40">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center dark:text-slate-400">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-teal-700 hover:underline font-medium dark:text-teal-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
