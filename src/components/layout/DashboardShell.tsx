'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

interface DashboardShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', closeOnEsc)
    return () => document.removeEventListener('keydown', closeOnEsc)
  }, [])

  return (
    <>
      <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden safe-area-top">
        <TopBar user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 lg:pb-0 px-4 lg:px-6 py-4 lg:py-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  )
}
