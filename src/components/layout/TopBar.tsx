'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

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
  user: { name?: string | null; email?: string | null; emailVerified?: string | null }
  onMenuToggle: () => void
}

export function TopBar({ user, onMenuToggle }: TopBarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'FinTrack'

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
        <NotificationDropdown />
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
