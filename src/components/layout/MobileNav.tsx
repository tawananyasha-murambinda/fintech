'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

const TABS: Tab[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-8.5Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/transactions',
    label: 'Activity',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round">
        <path d="M4 7h16M4 12h11M4 17h14" />
      </svg>
    ),
  },
  {
    href: '/dashboard/accounts',
    label: 'Cards',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 9.5h18" stroke={a ? 'var(--surface, #fff)' : 'currentColor'} strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/intelligence',
    label: 'Insights',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 15l4-5 3.5 3L19 6" />
        <path d="M5 19h14" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/chat',
    label: 'Assistant',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M20 12a7 7 0 0 1-7 7H7l-3 3v-9a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7Z" />
      </svg>
    ),
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-200/70 dark:border-slate-800 safe-area-bottom">
      <div className="flex items-stretch justify-around h-[60px]">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 press ${
                active
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.icon(active)}
              <span className={`text-[10px] tracking-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
