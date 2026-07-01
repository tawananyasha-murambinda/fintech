'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    href: '/dashboard/transactions',
    label: 'Transactions',
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h12M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    href: '/dashboard/intelligence',
    label: 'Analytics',
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12.5c.5 1.1 1.5 1.9 3 1.9s2.5-.8 3-1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="13" cy="9" r="1" fill="currentColor"/></svg>,
  },
  {
    href: '/dashboard/accounts',
    label: 'Accounts',
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    href: '/dashboard/chat',
    label: 'Assistant',
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M19 13a2 2 0 01-2 2H6l-4 4V5a2 2 0 012-2h13a2 2 0 012 2v8z" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors duration-100 ${
                active
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className={active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}>
                {tab.icon}
              </span>
              <span className={`text-2xs font-medium ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
