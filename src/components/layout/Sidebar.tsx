'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
  open: boolean
  onClose: () => void
}

interface NavGroup {
  label: string
  icon: React.ReactNode
  items: { href: string; label: string; icon: React.ReactNode }[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Transactions',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    items: [
      { href: '/dashboard/transactions', label: 'Transactions', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { href: '/dashboard/manual', label: 'Manual', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 4v8M4 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { href: '/dashboard/rules', label: 'Auto-Rules', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
    ],
  },
  {
    label: 'Planning',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    items: [
      { href: '/dashboard/budgets', label: 'Budgets', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { href: '/dashboard/goals', label: 'Goals', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg> },
      { href: '/dashboard/bills', label: 'Bills', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/><path d="M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6l6-4 6 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 6v5a1 1 0 001 1h6a1 1 0 001-1V6" stroke="currentColor" strokeWidth="1.4"/><path d="M6 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
    ],
  },
  {
    label: 'Wealth',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/></svg>,
    items: [
      { href: '/dashboard/net-worth', label: 'Net Worth', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/></svg> },
      { href: '/dashboard/investments', label: 'Investments', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/dashboard/debt', label: 'Debt Planner', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 5h8M4 8h5M4 11h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
      { href: '/dashboard/tax', label: 'Tax Organizer', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5h6M5 8h4M5 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
    ],
  },
  {
    label: 'Analytics',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4h8v8H4V4z" stroke="currentColor" strokeWidth="1.4"/><path d="M4 8h8" stroke="currentColor" strokeWidth="1.4"/></svg>,
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4h8v8H4V4z" stroke="currentColor" strokeWidth="1.4"/><path d="M4 8h8" stroke="currentColor" strokeWidth="1.4"/></svg> },
      { href: '/dashboard/cashflow', label: 'Cash Flow', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8l4-4 3 3 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/dashboard/intelligence', label: 'Intelligence', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 9.5C5.5 11 6.6 12 8 12s2.5-1 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6" cy="7" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/></svg> },
      { href: '/dashboard/alerts', label: 'Alerts', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v1M13 3l-1 1M15 8h-1M13 13l-1-1M8 14v1M3 13l1-1M1 8h1M3 3l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="8" r="2.5" fill="currentColor"/></svg> },
    ],
  },
  {
    label: 'Accounts',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/></svg>,
    items: [
      { href: '/dashboard/accounts', label: 'Accounts', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/></svg> },
      { href: '/dashboard/household', label: 'Household', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 13v-1a3 3 0 00-3-3H4a3 3 0 00-3 3v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M15 13v-1a3 3 0 00-2-2.87" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      { href: '/dashboard/credit-score', label: 'Credit Score', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8H2V4z" stroke="currentColor" strokeWidth="1.4"/><path d="M5 10l2-2 2 2 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/dashboard/rewards', label: 'Rewards', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 3 3.5.5L11 7l.5 3.5L8 9l-3.5 1.5L5 7 2.5 4.5 6 4l2-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
    ],
  },
]

const SINGLE_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { href: '/dashboard/chat', label: 'Assistant', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10a2 2 0 01-2 2H4l-3 3V4a2 2 0 012-2h10a2 2 0 012 2v6z" stroke="currentColor" strokeWidth="1.4"/></svg> },
]

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    for (const g of GROUPS) {
      state[g.label] = g.items.some(item => pathname.startsWith(item.href))
    }
    return state
  })

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() || '?'

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  function toggleGroup(label: string) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-700 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-sm dark:text-slate-100">FinTrack</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Single items */}
        {SINGLE_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100 ${
                active
                  ? 'bg-teal-50 text-teal-700 font-medium dark:bg-teal-950 dark:text-teal-300'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <span className={active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Groups */}
        {GROUPS.map((group) => {
          const groupActive = group.items.some(item => isActive(item.href))
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-100 ${
                  groupActive
                    ? 'text-slate-900 font-medium dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={groupActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}>{group.icon}</span>
                  {group.label}
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`text-slate-400 transition-transform duration-150 ${openGroups[group.label] ? 'rotate-90' : ''}`}
                >
                  <path d="M4.5 2.5L7.5 6l-3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {openGroups[group.label] && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-100 dark:border-slate-800">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-r-lg text-sm transition-colors duration-100 ${
                          active
                            ? 'bg-teal-50 text-teal-700 font-medium dark:bg-teal-950 dark:text-teal-300'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className={active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group dark:hover:bg-slate-800"
        >
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0 dark:bg-teal-950 dark:text-teal-300">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-900 truncate dark:text-slate-100">{user.name || 'Account'}</p>
            <p className="text-2xs text-slate-400 truncate">{user.email}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-300 group-hover:text-slate-400 shrink-0 dark:text-slate-600 dark:group-hover:text-slate-500">
            <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-slate-100 flex-col h-full shrink-0 dark:bg-slate-900 dark:border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
