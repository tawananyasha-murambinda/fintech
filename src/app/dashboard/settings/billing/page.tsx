'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SettingsCard, SettingsRow } from '@/components/settings/SettingsCard'
import type { Entitlements, PlanDisplay, PlanId } from '@/lib/plans'

type BillingSummary = {
  plan: PlanId
  planName: string
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  manageable: boolean
  checkoutAvailable: boolean
  entitlements: Entitlements
  usage: { linkedBanks: number; aiCallsToday: number }
  plans: PlanDisplay[]
}

function price(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}/mo`
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const atLimit = used >= limit
  return (
    <div className="w-full sm:w-40">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>{used} of {limit}</span>
        {atLimit && <span className="text-amber-600 dark:text-amber-400">At limit</span>}
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${atLimit ? 'bg-amber-500' : 'bg-teal-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BillingPageContent() {
  const params = useSearchParams()
  const checkoutResult = params.get('checkout')

  const [data, setData] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/me')
      if (res.ok) setData(await res.json())
      else setMessage('We could not load your billing details.')
    } catch {
      setMessage('We could not load your billing details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Stripe redirects back before its webhook has necessarily landed, so the
  // new plan may take a moment to appear. Re-check once rather than showing a
  // stale plan and letting the user think the payment failed.
  useEffect(() => {
    if (checkoutResult !== 'success') return
    const timer = setTimeout(load, 2500)
    return () => clearTimeout(timer)
  }, [checkoutResult, load])

  async function post(path: string, body?: unknown, key = path) {
    setBusy(key)
    setMessage('')
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
        return
      }
      setMessage(json.error || 'Something went wrong. Please try again.')
    } catch {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <SettingsCard title="Plan and billing">
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </SettingsCard>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto">
        <SettingsCard title="Plan and billing">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {message || 'Billing details are unavailable right now.'}
          </p>
        </SettingsCard>
      </div>
    )
  }

  const renewLabel = data.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Back to settings
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
          Plan and billing
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
          Your current plan, what it includes, and how much of it you have used.
        </p>
      </div>

      {checkoutResult === 'success' && (
        <div
          role="status"
          className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/40 dark:text-teal-200"
        >
          Payment received — thank you. Your new plan may take a few seconds to appear.
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div
          role="status"
          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          Checkout was cancelled. You have not been charged.
        </div>
      )}
      {message && (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          {message}
        </div>
      )}

      <SettingsCard title="Current plan" description="What you are on today.">
        <SettingsRow
          label={data.planName}
          description={
            data.cancelAtPeriodEnd && renewLabel
              ? `Cancels on ${renewLabel}.`
              : renewLabel
                ? `Renews on ${renewLabel}.`
                : 'No paid subscription.'
          }
        >
          {data.manageable ? (
            <button
              onClick={() => post('/api/billing/portal')}
              disabled={busy !== null}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {busy === '/api/billing/portal' ? 'Opening…' : 'Manage billing'}
            </button>
          ) : (
            <span className="text-xs text-slate-400">No billing history yet</span>
          )}
        </SettingsRow>

        <SettingsRow label="Linked banks" description="Each connection has a monthly cost.">
          <UsageBar used={data.usage.linkedBanks} limit={data.entitlements.linkedBanks} />
        </SettingsRow>

        <SettingsRow label="AI questions today" description="Resets at midnight UTC.">
          <UsageBar used={data.usage.aiCallsToday} limit={data.entitlements.aiCallsPerDay} />
        </SettingsRow>

        <SettingsRow label="History retained" description="How far back your transactions are kept.">
          <span className="text-sm text-slate-900 dark:text-slate-100">
            {data.entitlements.historyMonths} months
          </span>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Plans" description="Upgrade or downgrade at any time.">
        <div className="grid gap-4 sm:grid-cols-3 pt-1">
          {data.plans.map((plan) => {
            const current = plan.id === data.plan
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-4 flex flex-col ${
                  current
                    ? 'border-teal-500 dark:border-teal-500'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  {current && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {price(plan.monthlyPriceCents)}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed dark:text-slate-400">
                  {plan.tagline}
                </p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5"
                    >
                      <span aria-hidden="true" className="text-teal-600 dark:text-teal-400">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {!current && plan.id !== 'free' && data.checkoutAvailable && (
                  <button
                    onClick={() => post('/api/billing/checkout', { plan: plan.id }, plan.id)}
                    disabled={busy !== null}
                    className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {busy === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                  </button>
                )}
                {!current && plan.id === 'free' && data.manageable && (
                  <button
                    onClick={() => post('/api/billing/portal')}
                    disabled={busy !== null}
                    className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 pt-2 dark:text-slate-500">
          Payments are processed by Stripe. FinTrack never sees your card details.
        </p>
      </SettingsCard>
    </div>
  )
}

// useSearchParams opts the tree into client-side rendering, which Next
// requires be wrapped in a Suspense boundary or the production build fails.
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto">
          <SettingsCard title="Plan and billing">
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </SettingsCard>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
