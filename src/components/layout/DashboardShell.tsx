'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'
import { GradientHeader } from './GradientHeader'

interface DashboardShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
  children: React.ReactNode
}

// Page titles for the mobile gradient banner. Routes that render their own
// GradientHeader (or a custom immersive header) are excluded below.
const PAGE_TITLES: Record<string, string> = {
  '/dashboard/budgets': 'Budgets',
  '/dashboard/goals': 'Savings goals',
  '/dashboard/bills': 'Bills',
  '/dashboard/subscriptions': 'Subscriptions',
  '/dashboard/net-worth': 'Net worth',
  '/dashboard/debt': 'Debt planner',
  '/dashboard/investments': 'Investments',
  '/dashboard/vault': 'Savings vault',
  '/dashboard/reports': 'Reports',
  '/dashboard/cashflow': 'Cash flow',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/rules': 'Rules',
  '/dashboard/manual': 'Manual entry',
  '/dashboard/credit-score': 'Credit score',
  '/dashboard/rewards': 'Rewards',
  '/dashboard/household': 'Household',
  '/dashboard/tax': 'Tax organizer',
  '/dashboard/chat': 'Assistant',
  '/dashboard/settings': 'Settings',
}

// Routes that already own an immersive header — don't add the shell banner.
const SELF_HEADED = ['/dashboard', '/dashboard/transactions', '/dashboard/accounts', '/dashboard/intelligence']

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname()
  const showBanner = !SELF_HEADED.includes(pathname) && !!PAGE_TITLES[pathname]

  return (
    <>
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden safe-area-top">
        <TopBar user={user} />
        <main id="main-content" className="flex-1 overflow-y-auto pb-20 lg:pb-6 px-4 lg:px-6 py-4 lg:py-6">
          {showBanner && (
            <div className="lg:hidden">
              <GradientHeader title={PAGE_TITLES[pathname]} />
            </div>
          )}
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  )
}
