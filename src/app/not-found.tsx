import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-300 dark:text-slate-600">404</p>
        <h1 className="text-lg font-semibold text-slate-900 mt-2 dark:text-slate-100">Page not found</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">The page you are looking for does not exist.</p>
        <Link href="/dashboard" className="btn-primary inline-block">Go home</Link>
      </div>
    </div>
  )
}
