import Link from 'next/link'
import { CashflowRibbon } from '@/components/charts/CashflowRibbon'
import { CategoryChart } from '@/components/charts/CategoryChart'
import { DEMO_CATEGORIES } from '@/lib/demo-data'
import { Logo, LogoMark } from '@/components/brand/Logo'

// Three claims, each one a thing the app actually does — no invented
// statistics, no "trusted by thousands" for a product with no users yet.
const PILLARS = [
  {
    title: 'Read-only by design',
    body: 'Accounts connect through Plaid. FinTrack sees transactions and nothing else — it cannot move a penny, and your bank credentials never reach our servers.',
  },
  {
    title: 'An assistant that looks things up',
    body: 'Ask it anything about your money and it queries your actual budgets, bills, debts and transactions before answering. No generic advice.',
  },
  {
    title: 'Notices what you would not',
    body: 'A charge out of character for you, a subscription that quietly went up, a budget on course to blow by the 20th. It tells you while you can still act.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--wash-base)' }}>
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Logo size={26} />
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
            Get started
          </Link>
        </div>
      </nav>

      <main id="main" className="max-w-6xl mx-auto px-6">
        {/* Hero. Asymmetric rather than centred — a centred stack of
            eyebrow/headline/subhead/buttons is the most generic layout there
            is, and this is the first thing anyone sees. */}
        <section className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="lg:col-span-7">
            <span className="badge badge-accent mb-6">
              <LogoMark size={11} accent={false} />
              Personal finance, properly wired
            </span>
            <h1 className="font-display text-[2.75rem] leading-[1.02] sm:text-[3.5rem] lg:text-[4rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">
              Know where it
              <br />
              actually went.
            </h1>
            <p className="text-lg text-[var(--ink-muted)] leading-relaxed mt-6 max-w-lg">
              Link your accounts once. FinTrack categorises every transaction, watches your
              budgets against the calendar, and tells you the things worth knowing before
              they cost you.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
                Connect your accounts
              </Link>
              <Link href="/auth/login" className="btn-secondary px-6 py-3 text-base">
                Sign in
              </Link>
            </div>
            <p className="text-xs text-[var(--ink-faint)] mt-5">
              Read-only bank access · Cancel any time · Your data stays yours
            </p>
          </div>

          {/* A real figure rather than a stock illustration. */}
          <div className="lg:col-span-5">
            <div className="card-raised p-6">
              <p className="label mb-1">Net position · this month</p>
              <p className="display-number text-[2.75rem] text-[var(--ink)]">£4,182</p>
              <p className="text-sm text-[var(--positive)] font-medium mt-1.5">
                +£620 on last month
              </p>
              <div className="divider my-5" />
              <p className="label">Where it went</p>
              <div className="mt-3">
                <CategoryChart data={DEMO_CATEGORIES} />
              </div>
            </div>
          </div>
        </section>

        {/* Cashflow, full width — the chart is the argument. */}
        <section className="card-raised p-6 sm:p-8 mb-20">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
            <div>
              <h2 className="section-title">Cashflow</h2>
              <p className="text-xs text-[var(--ink-faint)] mt-1">
                Money in against money out, day by day
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--ink-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--line-strong)] inline-block" />
                Expenses
              </span>
            </div>
          </div>
          <CashflowRibbon demo />
        </section>

        <section className="pb-24">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] mb-3">
            Built to be trusted with this.
          </h2>
          <p className="text-[var(--ink-muted)] max-w-xl mb-10">
            It is your bank data. The bar for what an app does with it should be high.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {PILLARS.map((pillar, i) => (
              <div key={pillar.title} className="card card-hover p-6">
                <span className="display-number text-sm text-[var(--ink-faint)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold text-[var(--ink)] mt-4 mb-2 tracking-[-0.01em]">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <Logo size={22} />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--ink-muted)]">
            <Link href="/legal/privacy" className="hover:text-[var(--ink)] transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-[var(--ink)] transition-colors">
              Terms
            </Link>
            <Link href="/legal/disclosures" className="hover:text-[var(--ink)] transition-colors">
              Disclosures
            </Link>
            <Link href="/help" className="hover:text-[var(--ink)] transition-colors">
              Help
            </Link>
            <Link href="/status" className="hover:text-[var(--ink)] transition-colors">
              Status
            </Link>
          </div>
          <p className="text-xs text-[var(--ink-faint)]">
            Bank connections via Plaid · Assistant by Claude
          </p>
        </div>
      </footer>
    </div>
  )
}
