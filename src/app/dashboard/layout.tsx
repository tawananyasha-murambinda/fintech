import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { DashboardShell } from '@/components/layout/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden dark:bg-slate-950">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <DashboardShell user={session.user}>
        {children}
      </DashboardShell>
    </div>
  )
}
