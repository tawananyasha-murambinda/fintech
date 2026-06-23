'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

const NAV = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/transactions',
    label: 'Transactions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/intelligence',
    label: 'Intelligence',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 9.5C5.5 11 6.6 12 8 12s2.5-1 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="6" cy="7" r="1" fill="currentColor"/>
        <circle cx="10" cy="7" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/accounts',
    label: 'Accounts',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() || '?'

  return (
    <aside className="w-56 bg-white border-r border-slate-100 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-700 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-sm">FinTrack</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100 ${
                active
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={active ? 'text-teal-700' : 'text-slate-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-900 truncate">{user.name || 'Account'}</p>
            <p className="text-2xs text-slate-400 truncate">{user.email}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-300 group-hover:text-slate-400 shrink-0">
            <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </aside>
  )
}
