'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import Link from 'next/link'

interface Subscription {
  name: string
  category: string | null
  monthlyAmount: number
  frequency: string
  lastCharge: string
  transactionCount: number
}

const CANCEL_LINKS: Record<string, string> = {
  netflix: 'https://www.netflix.com/account/cancel',
  'hulu': 'https://secure.hulu.com/account/cancel',
  'disney+': 'https://www.disneyplus.com/account/cancel',
  'disney': 'https://www.disneyplus.com/account/cancel',
  'hbo': 'https://account.hbomax.com/settings',
  'max': 'https://account.hbomax.com/settings',
  'paramount+': 'https://www.paramountplus.com/account/',
  'peacock': 'https://www.peacocktv.com/account',
  'spotify': 'https://www.spotify.com/account/cancel/',
  'apple music': 'https://music.apple.com/subscribe',
  'youtube premium': 'https://www.youtube.com/premium',
  'youtube': 'https://www.youtube.com/premium',
  'amazon prime': 'https://www.amazon.com/gp/help/customer/display.html?nodeId=202161120',
  'audible': 'https://www.audible.com/member/account',
  'kindle': 'https://www.amazon.com/hz/mycd/myx',
  'chatgpt': 'https://chat.openai.com/account/billing',
  'openai': 'https://platform.openai.com/account/billing',
  'midjourney': 'https://www.midjourney.com/account/',
  'notion': 'https://www.notion.so/settings',
  'figma': 'https://www.figma.com/settings',
  'adobe': 'https://account.adobe.com/plans',
  'canva': 'https://www.canva.com/account',
  'grammarly': 'https://account.grammarly.com/',
  'duolingo': 'https://www.duolingo.com/settings/account',
  'strava': 'https://www.strava.com/account',
  'peloton': 'https://www.onepeloton.com/account',
  'headspace': 'https://www.headspace.com/account',
  'calm': 'https://www.calm.com/account',
  'crunchyroll': 'https://www.crunchyroll.com/account',
  'tidal': 'https://tidal.com/account',
  'dropbox': 'https://www.dropbox.com/account/plan',
  'google one': 'https://one.google.com/',
  'icloud': 'https://appleid.apple.com/account/manage',
  'microsoft 365': 'https://account.microsoft.com/services',
  'patreon': 'https://www.patreon.com/settings',
  'substack': 'https://substack.com/account',
  'medium': 'https://medium.com/me/settings',
  'skillshare': 'https://www.skillshare.com/account',
  'masterclass': 'https://www.masterclass.com/account',
  'linkedin premium': 'https://www.linkedin.com/premium/',
  'github': 'https://github.com/settings/billing',
}

function findCancelUrl(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [key, url] of Object.entries(CANCEL_LINKS)) {
    if (lower.includes(key)) return url
  }
  return null
}

function nameToIcon(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('netflix')) return 'N'
  if (lower.includes('spotify')) return 'S'
  if (lower.includes('apple') || lower.includes('icloud')) return 'A'
  if (lower.includes('amazon')) return 'Z'
  if (lower.includes('google')) return 'G'
  if (lower.includes('microsoft')) return 'M'
  if (lower.includes('disney')) return 'D'
  if (lower.includes('hulu')) return 'H'
  if (lower.includes('hbo') || lower.includes('max')) return 'HB'
  if (lower.includes('youtube')) return 'Y'
  if (lower.includes('chatgpt') || lower.includes('openai')) return 'AI'
  if (lower.includes('notion')) return 'N'
  if (lower.includes('adobe')) return 'A'
  if (lower.includes('figma')) return 'F'
  if (lower.includes('github')) return 'GH'
  return name.charAt(0).toUpperCase()
}

const SUBSCRIPTION_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-amber-500', 'bg-green-500', 'bg-indigo-500', 'bg-teal-500',
]

export default function SubscriptionsPage() {
  const { format: fmt } = useCurrency()
  const [data, setData] = useState<{ subscriptions: Subscription[]; totalMonthly: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscriptions').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-600 dark:text-purple-400">
              <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3.51 9a9 9 0 0114.85 3.36L23 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Subscriptions</h1>
            <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
              All detected recurring charges from your transactions.
            </p>
          </div>
        </div>
        <Link href="/dashboard/intelligence" className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
          View intelligence →
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : !data || data.subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3.51 9a9 9 0 0114.85 3.36L23 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-100">No subscriptions detected</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 dark:text-slate-400">
            Sync your bank transactions and run an intelligence analysis to find subscriptions.
          </p>
          <Link href="/dashboard/intelligence" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
            Run analysis
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500 mb-1">Monthly spend</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{fmt(data.totalMonthly)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500 mb-1">Active subs</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{data.count}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider dark:text-slate-500 mb-1">Yearly cost</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmt(data.totalMonthly * 12)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {data.subscriptions.map((sub, i) => {
              const cancelUrl = findCancelUrl(sub.name)
              const color = SUBSCRIPTION_COLORS[i % SUBSCRIPTION_COLORS.length]
              return (
                <div key={sub.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {nameToIcon(sub.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sub.name}</p>
                        <p className="text-2xs text-slate-400">
                          {sub.category || 'Uncategorized'} · every {sub.frequency} · {sub.transactionCount} charge{sub.transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(sub.monthlyAmount)}</p>
                        <p className="text-2xs text-slate-400">{fmt(sub.monthlyAmount * 12)}/yr</p>
                      </div>
                      {cancelUrl && (
                        <a href={cancelUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-semibold text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">
                          Cancel
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
