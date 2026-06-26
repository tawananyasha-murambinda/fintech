'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight dark:text-slate-100">Sign in</h1>
        <p className="text-sm text-slate-500 mt-1.5 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-teal-700 hover:underline font-medium dark:text-teal-400">
            Create one
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          onClick={() => signIn('github', { callbackUrl })}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <GitHubIcon />
          Continue with GitHub
        </button>
      </div>

      {/* Biometric note for Capacitor */}
      <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-teal-600 shrink-0">
          <path d="M8 1.5L2 4v4c0 3.31 2.69 6 6 6s6-2.69 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {typeof window !== 'undefined' && 'Capacitor' in (window as any)
            ? 'Using the app? Google/GitHub login opens your system browser for security, then returns here.'
            : 'Enable biometric unlock in Settings after signing in for quick access.'}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-teal-700 hover:underline dark:text-teal-400">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            minLength={8}
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
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3c-.18.99-.74 1.83-1.57 2.4v2h2.54c1.49-1.37 2.35-3.4 2.35-5.86z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.71 5.3-1.94l-2.54-2c-.71.47-1.62.75-2.76.75-2.12 0-3.92-1.43-4.56-3.36H.84v2.06C2.16 14.16 4.9 16 8 16z" fill="#34A853"/>
      <path d="M3.44 9.45A4.8 4.8 0 0 1 3.2 8c0-.5.09-.98.24-1.45V4.49H.84A7.99 7.99 0 0 0 0 8c0 1.29.31 2.51.84 3.61l2.6-2.16z" fill="#FBBC05"/>
      <path d="M8 3.18c1.19 0 2.27.41 3.11 1.21l2.33-2.33C11.97.79 10.16 0 8 0 4.9 0 2.16 1.84.84 4.49l2.6 2.06C4.08 4.62 5.88 3.18 8 3.18z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  )
}
