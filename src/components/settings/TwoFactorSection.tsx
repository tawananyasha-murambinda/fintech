'use client'

import { useCallback, useEffect, useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'

type Status = {
  enabled: boolean
  enabledAt: string | null
  remainingRecoveryCodes: number
}

type Step = 'idle' | 'enrolling' | 'codes' | 'disabling'

export function TwoFactorSection() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [secret, setSecret] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/recovery-codes')
      if (res.ok) setStatus(await res.json())
    } catch {
      /* leave status null; the card renders an unavailable state */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function reset() {
    setStep('idle')
    setCode('')
    setPassword('')
    setSecret('')
    setQrDataUrl('')
    setError('')
  }

  async function startEnrolment() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start setup.')
      setSecret(data.secret)
      setQrDataUrl(data.qrDataUrl)
      setStep('enrolling')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnrolment(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not turn on two-factor authentication.')
      setRecoveryCodes(data.recoveryCodes)
      setStep('codes')
      setCode('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not turn it off.')
      reset()
      setNotice('Two-factor authentication is off.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function regenerate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/recovery-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not regenerate codes.')
      setRecoveryCodes(data.recoveryCodes)
      setStep('codes')
      setCode('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <SettingsCard title="Two-factor authentication">
        <div className="py-6 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard
      title="Two-factor authentication"
      description="Require a code from your phone as well as your password. Your bank data is worth protecting with more than one secret."
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}
      {notice && !error && (
        <div
          role="status"
          className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          {notice}
        </div>
      )}

      {/* One-time display of recovery codes */}
      {step === 'codes' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Save your recovery codes
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
            Each code works once, and this is the only time they are shown. Without them, losing your
            phone means losing access to the account.
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 font-mono text-xs text-amber-900 dark:text-amber-200">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
              className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Copy codes
            </button>
            <button
              onClick={() => {
                setRecoveryCodes([])
                reset()
              }}
              className="rounded-xl bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}

      {/* Enrolment */}
      {step === 'enrolling' && (
        <form onSubmit={confirmEnrolment} className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Scan this with an authenticator app (1Password, Authy, Google Authenticator), then enter
            the six-digit code it shows.
          </p>
          {qrDataUrl && (
            <div className="flex justify-center py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- a data
                  URI cannot go through the next/image optimiser */}
              <img
                src={qrDataUrl}
                alt="QR code for setting up two-factor authentication"
                width={220}
                height={220}
                className="rounded-lg bg-white p-2"
              />
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 dark:text-slate-400">
              Can&apos;t scan? Enter this key instead
            </summary>
            <code className="mt-2 block break-all rounded-lg bg-slate-50 p-2 font-mono text-2xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {secret}
            </code>
          </details>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            autoComplete="one-time-code"
            className="input text-center tracking-[0.4em]"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1 disabled:opacity-60">
              {busy ? 'Verifying…' : 'Turn on'}
            </button>
            <button type="button" onClick={reset} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Disable */}
      {step === 'disabling' && (
        <form onSubmit={disable} className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Confirm with your password and a current code.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="input"
            required
          />
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            autoComplete="one-time-code"
            className="input text-center tracking-[0.4em]"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Turning off…' : 'Turn off'}
            </button>
            <button type="button" onClick={reset} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === 'idle' && (
        <>
          <SettingsRow
            label={status?.enabled ? 'On' : 'Off'}
            description={
              status?.enabled
                ? `${status.remainingRecoveryCodes} recovery code${status.remainingRecoveryCodes === 1 ? '' : 's'} left`
                : 'Anyone with your password can sign in.'
            }
          >
            {status?.enabled ? (
              <button
                onClick={() => {
                  setNotice('')
                  setStep('disabling')
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Turn off
              </button>
            ) : (
              <button
                onClick={startEnrolment}
                disabled={busy}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {busy ? 'Starting…' : 'Turn on'}
              </button>
            )}
          </SettingsRow>

          {status?.enabled && (
            <form onSubmit={regenerate} className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Current code"
                autoComplete="one-time-code"
                className="input flex-1"
                required
              />
              <button type="submit" disabled={busy} className="btn-secondary shrink-0 disabled:opacity-60">
                New recovery codes
              </button>
            </form>
          )}
        </>
      )}
    </SettingsCard>
  )
}
