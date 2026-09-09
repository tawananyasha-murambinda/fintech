'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SettingsCard, SettingsRow } from './SettingsCard'

type Summary = {
  planName: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  usage: { linkedBanks: number; aiCallsToday: number }
  entitlements: { linkedBanks: number; aiCallsPerDay: number }
}

export function BillingSection() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SettingsCard title="Plan and billing" description="Your subscription and monthly limits.">
      {loading ? (
        <div className="py-6 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <SettingsRow
          label={data ? `${data.planName} plan` : 'Plan'}
          description={
            data
              ? `${data.usage.linkedBanks} of ${data.entitlements.linkedBanks} banks linked · ${data.usage.aiCallsToday} of ${data.entitlements.aiCallsPerDay} AI questions used today`
              : 'Billing details are unavailable right now.'
          }
        >
          <Link
            href="/dashboard/settings/billing"
            className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Manage plan
          </Link>
        </SettingsRow>
      )}
    </SettingsCard>
  )
}
