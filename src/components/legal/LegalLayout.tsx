import Link from 'next/link'

const NAV = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
  { href: '/legal/disclosures', label: 'Disclosures' },
  { href: '/legal/accessibility', label: 'Accessibility' },
]

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <nav className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="font-semibold text-teal-700 hover:underline dark:text-teal-400">
            FinTrack
          </Link>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">Last updated: {updated}</p>
        </header>

        <article className="prose-sm text-slate-600 leading-relaxed space-y-5 dark:text-slate-300 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:dark:text-slate-100 [&_strong]:text-slate-900 [&_strong]:dark:text-slate-100 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1">
          {children}
        </article>

        <footer className="mt-16 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Home</Link>
          <Link href="/help" className="hover:text-slate-600 dark:hover:text-slate-300">Help & Support</Link>
          <Link href="/auth/login" className="hover:text-slate-600 dark:hover:text-slate-300">Sign in</Link>
        </footer>
      </div>
    </div>
  )
}
