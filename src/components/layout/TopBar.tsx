'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/budgets': 'Budgets',
  '/dashboard/goals': 'Savings Goals',
  '/dashboard/bills': 'Bills & Calendar',
  '/dashboard/subscriptions': 'Subscriptions',
  '/dashboard/intelligence': 'Intelligence',
  '/dashboard/chat': 'Financial Assistant',
  '/dashboard/accounts': 'Accounts',
  '/dashboard/settings': 'Settings',
  '/dashboard/net-worth': 'Net Worth',
  '/dashboard/debt': 'Debt Planner',
  '/dashboard/investments': 'Investments',
  '/dashboard/reports': 'Reports',
  '/dashboard/cashflow': 'Cash Flow',
  '/dashboard/rules': 'Auto-Rules',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/tax': 'Tax Organizer',
  '/dashboard/manual': 'Manual Transactions',
  '/dashboard/household': 'Household',
  '/dashboard/credit-score': 'Credit Score',
  '/dashboard/rewards': 'Rewards',
}

interface TopBarProps {
  user: { name?: string | null; email?: string | null }
  onMenuToggle: () => void
}

export function TopBar({ user, onMenuToggle }: TopBarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'FinTrack'
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(data => {
      setUnread(data.filter((n: any) => !n.read).length)
    }).catch(() => {})
  }, [])

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 shrink-0 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/alerts" className="relative text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-300">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v1M13 3l-1 1M15 8h-1M13 13l-1-1M8 14v1M3 13l1-1M1 8h1M3 3l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-2xs rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-300"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
