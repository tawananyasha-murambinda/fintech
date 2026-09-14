'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

// "Safe to spend" — what is left once the money already promised to something
// else is taken out, and how long it has to last.
//
// The component is deliberately willing to say it does not know. A balance the
// bank has not reported, income too irregular to predict a payday from, or
// bills that already exceed the balance are all real states, and showing a
// confident number through any of them is the one failure that costs the user
// money.

type SafeToSpendData = {
  balance: number
  hasBalance: boolean
  accountsWithoutBalance: number
  committed: number
  upcomingBills: { name: string; amount: number; dueIn: number; dueDate: string }[]
  safeToSpend: number
  nextPayday: { date: string; source: string; amount: number; daysAway: number } | null
  daysToCover: number
  dailyAllowance: number
  caveats: string[]
}

export function SafeToSpend({ compact = false }: { compact?: boolean }) {
  const { format: fmt } = useCurrency()
  const [data, setData] = useState<SafeToSpendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/safe-to-spend')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && !d.error) setData(d)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className={compact ? 'px-5 py-5' : 'card p-6'}>
        <div className="skeleton h-3 w-24 rounded mb-3" />
        <div className="skeleton h-10 w-40 rounded" />
      </section>
    )
  }

  // Nothing to show rather than an empty shell: a user with no linked account
  // has no headroom to report, and the empty state elsewhere already covers it.
  if (!data || !data.hasBalance) return null

  const negative = data.safeToSpend < 0
  const horizon = data.nextPayday
    ? `until ${new Date(data.nextPayday.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
    : 'until the end of the month'

  return (
    <section className={compact ? 'px-5 py-5' : 'card p-6'}>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          {negative ? 'Short before payday' : 'Safe to spend'}
        </h2>
        {data.upcomingBills.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs font-medium text-[var(--accent)]"
            aria-expanded={showDetail}
          >
            {showDetail ? 'Hide' : 'How?'}
          </button>
        )}
      </div>

      <p
        className="display-number text-[2.5rem]"
        style={{ color: negative ? 'var(--negative)' : 'var(--ink)' }}
      >
        {fmt(Math.abs(data.safeToSpend))}
      </p>

      <p className="text-sm text-[var(--ink-muted)] mt-1.5 leading-relaxed">
        {negative ? (
          <>
            Your bills come to {fmt(data.committed)} {horizon}, which is more than the{' '}
            {fmt(data.balance)} you have.
          </>
        ) : (
          <>
            About <span className="font-semibold text-[var(--ink)]">{fmt(data.dailyAllowance)}</span> a
            day for {data.daysToCover} day{data.daysToCover === 1 ? '' : 's'} {horizon}
            {data.nextPayday ? `, when ${data.nextPayday.source} pays you.` : '.'}
          </>
        )}
      </p>

      {/* The arithmetic, on request. A number this consequential should be
          explainable rather than asserted. */}
      {showDetail && (
        <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
          <Row label="Balance" value={fmt(data.balance)} />
          <Row label={`Bills due ${horizon}`} value={`− ${fmt(data.committed)}`} />
          <div className="pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
            <Row label="Left" value={fmt(data.safeToSpend)} strong />
          </div>

          <ul className="pt-2 space-y-1.5">
            {data.upcomingBills.map((bill) => (
              <li key={`${bill.name}-${bill.dueDate}`} className="flex justify-between text-xs">
                <span className="text-[var(--ink-muted)] truncate pr-3">
                  {bill.name}
                  <span className="text-[var(--ink-faint)]">
                    {' '}
                    · {bill.dueIn === 0 ? 'today' : `in ${bill.dueIn}d`}
                  </span>
                </span>
                <span className="stat-number text-[var(--ink-soft)] shrink-0">
                  {fmt(bill.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.caveats.length > 0 && (
        <ul className="mt-3 space-y-1">
          {data.caveats.map((caveat) => (
            <li key={caveat} className="text-xs text-[var(--ink-faint)] leading-relaxed">
              {caveat}
              {caveat.includes('no reported balance') && (
                <>
                  {' '}
                  <Link href="/dashboard/accounts" className="underline">
                    Review accounts
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className={strong ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-muted)]'}>
        {label}
      </span>
      <span className={`stat-number ${strong ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}`}>
        {value}
      </span>
    </div>
  )
}
