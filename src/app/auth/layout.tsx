import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dark:bg-slate-950">
      <nav className="px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Logo size={26} />
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  )
}
