import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Help & Support' }

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is FinTrack?',
    a: 'FinTrack is a personal finance app that links your bank accounts (read-only), tracks your budgets, bills, goals, and investments, and uses AI to explain your spending. It is a planning tool, not a bank, and it never moves or withdraws money.',
  },
  {
    q: 'Is my bank connection safe?',
    a: 'Yes. Bank links go through Plaid, the same provider used by major fintech apps. FinTrack only receives a read-only view of your accounts and cannot initiate transfers. Access tokens are encrypted at rest with AES-256-GCM.',
  },
  {
    q: 'How much does it cost?',
    a: 'FinTrack is free during this beta phase. If paid plans are introduced later, existing users will be grandfathered and notified in advance.',
  },
  {
    q: 'Why are my transactions missing or delayed?',
    a: 'Transactions are synced on a schedule and when Plaid notifies us of updates. Your bank can also delay data. Try the "Sync now" button on the Transactions or Accounts page, or reconnect the bank from Settings.',
  },
  {
    q: 'How do I disconnect a bank?',
    a: 'Open Settings → Accounts, find the linked bank, and choose Remove. This deletes the stored connection and its synced transactions.',
  },
  {
    q: 'How do I export or delete my data?',
    a: 'Settings → Data Privacy offers an "Export data" button (downloads a JSON copy of everything) and a "Delete account" flow that permanently removes your data. See our Privacy Policy for retention details.',
  },
  {
    q: 'How does the AI assistant work?',
    a: 'The assistant summarizes and explains your transactions. Personal identifiers such as emails, card numbers, and IBANs are removed before anything is sent to the AI provider, and your daily usage is capped automatically.',
  },
  {
    q: 'I did not receive a verification email.',
    a: 'Check spam, then use the resend link on the verify screen. If it still does not arrive, contact support with the email address you registered with.',
  },
  {
    q: 'I forgot my password.',
    a: 'Use "Forgot password" on the sign-in page. A reset link is emailed to you and is valid for 1 hour.',
  },
  {
    q: 'My account appears locked.',
    a: 'After several failed sign-in attempts we temporarily block the attempt to protect your account. Wait 15 minutes and try again, or reset your password.',
  },
  {
    q: 'Can I use FinTrack offline?',
    a: 'FinTrack is a web app and needs an internet connection. The mobile PWA lets you install it to your home screen for a full-screen, app-like experience.',
  },
  {
    q: 'What should I do if I spot an error in the app?',
    a: 'Use the "Send feedback" option in Settings, or email support with the page, what you were doing, and your browser. Error reports are sent automatically and help us fix issues faster.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <nav className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="font-semibold text-teal-700 hover:underline dark:text-teal-400">FinTrack</Link>
          <Link href="/legal/privacy" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">Privacy Policy</Link>
          <Link href="/legal/terms" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">Terms</Link>
          <Link href="/auth/login" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">Sign in</Link>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Help & Support</h1>
          <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
            Answers to common questions. Can&apos;t find what you need? Email{' '}
            <a href="mailto:support@fintrack.app" className="text-teal-700 underline dark:text-teal-400">support@fintrack.app</a>{' '}
            or use the feedback form in Settings.
          </p>
        </header>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <summary className="cursor-pointer text-sm font-medium text-slate-800 list-none flex items-center justify-between gap-4 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-teal-700 text-lg leading-none group-open:rotate-45 transition-transform dark:text-teal-400">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-teal-50 dark:bg-slate-900 border border-teal-100 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Still need help?</h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Tell us what happened and include the page you were on and your browser. We usually reply within 2 business days.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href="mailto:support@fintrack.app" className="btn-primary text-xs">Email support</a>
            <Link href="/auth/register" className="btn-secondary text-xs">Open feedback in the app</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
