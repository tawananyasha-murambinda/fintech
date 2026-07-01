import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dark:bg-slate-950">
      <nav className="px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <img src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-slate-900 tracking-tight text-sm dark:text-slate-100">FinTrack</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  )
}
