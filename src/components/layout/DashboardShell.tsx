'use client'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

interface DashboardShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <>
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden safe-area-top">
        <TopBar user={user} />
        <main id="main-content" className="flex-1 overflow-y-auto pb-20 lg:pb-6 px-4 lg:px-6 py-4 lg:py-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  )
}
