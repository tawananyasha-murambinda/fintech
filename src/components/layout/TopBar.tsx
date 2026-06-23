'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/intelligence': 'Intelligence',
  '/dashboard/accounts': 'Accounts',
  '/dashboard/settings': 'Settings',
}

interface TopBarProps {
  user: { name?: string | null; email?: string | null }
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'FinTrack'

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Sign out
      </button>
    </header>
  )
}
