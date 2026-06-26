'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyForm />
    </Suspense>
  )
}

function VerifyForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    fetch('/api/auth/confirm-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setStatus('success')
        setMessage('Email verified successfully!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed.')
      }
    }).catch(() => {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    })
  }, [token, email])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 4L12 14 2 4" /><path d="M2 4h20v16H2z" />
          </svg>
        </div>

        {status === 'loading' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verifying your email…</h1>
            <div className="mt-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Email verified!</h1>
            <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">{message}</p>
            <Link href="/dashboard" className="btn-primary inline-block mt-6">
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verification failed</h1>
            <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">{message}</p>
            <div className="mt-6 flex flex-col gap-3 items-center">
              {email && (
                <button
                  onClick={() => {
                    setStatus('loading')
                    setMessage('')
                    fetch('/api/auth/verify-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    }).then(() => {
                      setStatus('success')
                      setMessage('New verification email sent!')
                    }).catch(() => {
                      setStatus('error')
                      setMessage('Failed to send. Try again.')
                    })
                  }}
                  className="btn-secondary text-xs"
                >
                  Resend verification
                </button>
              )}
              <Link href="/auth/login" className="btn-primary text-xs">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
