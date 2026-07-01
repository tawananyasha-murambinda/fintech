import Link from 'next/link'
import { CashflowRibbon } from '@/components/charts/CashflowRibbon'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-slate-900 tracking-tight">FinTrack</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-secondary text-xs py-2">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn-primary text-xs py-2">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-16">
          <p className="text-xs font-medium text-teal-700 uppercase tracking-widest mb-5">
            Intelligent personal finance
          </p>
          <h1 className="text-5xl font-semibold text-slate-900 tracking-tight leading-tight mb-6">
            Your money, fully mapped.
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Link your bank accounts, understand exactly where your money moves, and get AI-powered
            recommendations on where to spend less — based on your location and habits.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
              Connect your accounts
            </Link>
            <Link href="/auth/login" className="btn-secondary px-6 py-3 text-base">
              Sign in
            </Link>
          </div>
        </div>

        {/* Cashflow ribbon demo */}
        <div className="card p-6 mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Live cashflow</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time income vs. outflow</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                Expenses
              </span>
            </div>
          </div>
          <CashflowRibbon demo />
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              title: 'Bank-grade security',
              body: 'Teller.io open banking with mTLS certificate authentication. Your credentials never touch our servers.',
            },
            {
              title: 'AI spending analysis',
              body: 'Claude analyses every transaction — categories, merchants, locations — and surfaces where you can genuinely save.',
            },
            {
              title: 'Cheaper alternatives',
              body: 'Spending at pricey merchants? The AI identifies cheaper local alternatives based on your actual location data.',
            },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <span>FinTrack — Intelligent personal finance</span>
          <span>Bank connections via Teller.io · AI by Anthropic Claude</span>
        </div>
      </footer>
    </div>
  )
}
